import { ApplicationInitStatus, APP_INITIALIZER, Component, Inject, OnInit,ViewChild,Renderer2   } from '@angular/core';
import { DataService } from './data.component';
import {NestedTreeControl} from '@angular/cdk/tree';
import {FormControl, AbstractControl, ValidationErrors, ValidatorFn,FormGroupDirective, NgForm, Validators} from '@angular/forms';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import {Sort, MatSortModule} from '@angular/material/sort';
import {ErrorStateMatcher} from '@angular/material/core';

declare var report_url: any,jira_url:any,wiki_job:any;
interface TestNode {
  name: string;
  children?: TestNode[];
  data?:any;
}

export function timeFormatValidator(): ValidatorFn {
  return (control:AbstractControl) : ValidationErrors | null => {

      const value = control.value;

      if (!value) {
          return null;
      }

      const  timeFormat = /^(\d{4}-[01]\d-[0-3]\d\s[0-2]\d:[0-5]\d:[0-5]\d)?$/.test(value);
  
      return !timeFormat ? {format:true}: null;
  }
}


export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  @ViewChild(BaseChartDirective) 
  public chart: BaseChartDirective | undefined;
  testTimeControl = new FormControl('',{validators:[timeFormatValidator()],updateOn:'change'});
  data:any;
  matcher = new MyErrorStateMatcher();
  jiraChanges = 0;
  taskChanges = 0;
  changedJiras = 0;
  treeControl = new NestedTreeControl<TestNode>(node => node.children);
  public lineChartData: ChartConfiguration<'line'>['data'] ={labels:[],datasets:[],

  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true
  };
  frontend:any;
  backend:any;  
  jira:any;
  data_type = "";
  initialized = false;
  workspace = "Tests";
  summarys : any;
  public lineChartLegend = true;
  selectIndex = 0;
  report_name = "";
  jira_url = jira_url;
  headers:string[] = [];
  datasources:any;
  jira_headers=["id","summary","scenarios","comment"];
  task_headers =["scenario","jiras","status","comment"];
  configure:any;
  jira_index:any = {};
  test_user_id:string = "";
  test_id:string = "";
  user:any;
  task:any;
  owners:any;
  new_jira:any;
  owner_list:any = [];
  constructor(private dataService: DataService,private _renderer2: Renderer2
    ){}
  ngOnInit(){
    
    if (window.parent){
      this.test_id = window.parent.location.hash;      
    }else{
      this.test_id = window.location.hash;
    }
    if(this.test_id.startsWith("#")){
      this.test_id = this.test_id.substring(1);
    }
    this.owners = {};
    if(location.origin.toLowerCase().indexOf("localhost")<0){
      this.user = {};      
      this.dataService.getUser().subscribe(data=>{        
        this.user.fullname=data.fullName;
        this.user.id=data.id;
        for (let item of data.property){
          if(item.address){
            this.user.email = item.address;
            this.user.username = item.address.split("@")[0];
          }
        }
      });
      this.dataService.getCrumb().subscribe(data=>{this.user.crumb=data.crumb})
    }
    this.dataService.getJSON().subscribe(data=>{
      this.data = [];
      this.summarys = [];           
      for(let key in data){
        if (key == "configure"){
          this.configure = data.configure;
          continue;
        }
        var context_data = {name:"Pages",data:new MatTreeNestedDataSource<TestNode>(),selected:false, search:""};
        var cucumber_data = {name:"Tests",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};
        var cases_data = {name:"Jiras",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};
        var tasks_data = {name:"Tasks",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};
        var tests:TestNode[] = [];
        var pages:TestNode[] = [];
        var cases:TestNode[] = [];
        var tasks:TestNode[] = [];
        var passed_jiras = 0;
        var moved_jiras = 0;
        var scenarios:any = {};
        var passed_jiras_list:any = [];
        if (data[key].owners){
          for (let owner in data[key].owners){
            if (!(this.owners[owner])){
              this.owners[owner] = data[key].owners[owner];
              this.owner_list.push(data[key].owners[owner].user);
            }
          }
        }
        for (let jira of data[key].jiras){
          var case_data:TestNode ={name:jira.id+":"+jira.summary,children:[],data:{
            id:jira.id,summary:jira.summary,scenarios:[],changes:[],checked:[],removed:[],existing:[],jiras:data[key].jiras,type:"jira",
            scenario_text:jira.scenario_text,passed_tests:jira.passed_tests
          }};          
          cases.push(case_data);
        }
        cases_data.data.data=cases;
        var auto_tests = 0
        var jobs:TestNode[] = [];        
        var auto_node:TestNode = {name:"Automation Test",children:[]}
        var env_check_cases = 0;
        for(let job in data[key].jobs){
          var job_item = data[key].jobs[job];
          var find_feature = false;
          var job_checked_cases = 0;
          var job_data:TestNode = {name:job,children:[]};
          var job_length = 0;
          var expand_nodes:any = {};
          
          if (job_item._type && job_item._type == 'report'){
            console.log(job_item);
            for(let scenario in job_item.scenarios){
              job_item.scenarios[scenario].sort((a:any,b:any)=>(a.build > b.build)?1:((b.build > a.build)?-1:0))
              var scenario_data:TestNode = {name:scenario,data:{data:job_item.scenarios[scenario],type:'report',report:job_item.data,report_name:job},children:[]};
              job_data.children?.push(scenario_data);
            }
            tests.push(job_data)
          }else{
            for (let feature in data[key].jobs[job]){  
              var feature_checked_cases = 0;            
              var feature_item = data[key].jobs[job][feature];
              var feature_data:TestNode = {name:feature,children:[]}
                for(let scenario in feature_item.scenarios){
                  var scenario_data:TestNode = {name:scenario,data:feature_item.scenarios[scenario],children:[]};
                  scenario_data.data.feature = feature_data;
                  scenario_data.data.job = job_data;
                  if (feature_data.children){
                    feature_data.children.push(scenario_data);
                  }              
                  if (this.test_id != "" && scenario_data.data.url.indexOf(this.test_id) > 0){
                    expand_nodes["feature"] = feature_data;
                    expand_nodes["job"] = job_data;                                                            
                  }
                  scenario_data.data.jiras = [];
                  scenario_data.data.changes = [];
                  scenario_data.data.removed = [];
                  if(scenario_data.data.JIRA){
                    feature_checked_cases++;    
                    scenario_data.data.jiras = scenario_data.data.JIRA.split(",");
                  }
                  scenarios[scenario] = scenario_data;
                  scenario_data.data.case_list = cases;
                  if(scenario_data.data.assigned){
                      this.setTask(tasks,scenario_data)
                  }
                  for (let jira of data[key].jiras){
                    if (scenario_data.data.JIRA && scenario_data.data.JIRA.indexOf(jira.id) >= 0){
                      for (let case_item of cases){
                        if (case_item.name.indexOf(jira.id)>=0){
                          case_item.data.scenarios.push(scenario_data);
                          case_item.data.existing.push(scenario_data.name);
                          break;
                        }
                      }  
                    }
                  }
                }     
              job_checked_cases += feature_checked_cases;           
              var feature_length = feature_data.children? feature_data.children.length:0;
              job_length = job_length + feature_length;
              if (feature_length > 0){
                feature_data.name = feature_data.name + "(" + feature_checked_cases + "/" + feature_length +")";
              }              
              if (job_data.children){
                job_data.children.push(feature_data);
              }            
              if (find_feature){
                this.treeControl.expand(job_data);
              }
            }
            if (job_length > 0){
              job_data.name = job_data.name + "(" + job_checked_cases + "/" + job_length + ")"
              env_check_cases += job_checked_cases;
              auto_tests += job_length;
            }          
            jobs.push(job_data)  
          }                    
        } 
        auto_node.children = jobs;
        if (auto_tests){
          auto_node.name += "(" + env_check_cases + "/" + auto_tests + ")"          
        }
        
        tests.push(auto_node);
        for (let page in data[key].context){
          var page_data = data[key].context[page];
          if ( page != "scenarios"){
            var page_node = this.getPageNode(page,page_data,scenarios);
            pages.push(page_node);  
          }
        }
        cucumber_data.data.data = tests;
        if (this.test_id != ""){
          this.treeControl.expand(cucumber_data);
        }
        context_data.data.data = pages;
        tasks_data.data.data = tasks;
        var env_data:any = {name:data[key].Env,perspectives:[cucumber_data,context_data,cases_data,tasks_data],selected:false,jiras:[],
            timelines:{containers:[],start_time:"",end_time:"",duration:0,value:0,headers:['name','start_time','end_time','duration','total','failed'],data_source:[]}};
        if (data[key].jiras){
          env_data.jiras = data[key].jiras;
        }
        if (data[key].timeline){
          var timelines:any = []
          var start_time = "";
          var end_time = "";
          for (let container in data[key].timeline){
            var timeline = data[key].timeline[container];
            data[key].timeline[container].total = data[key].timeline[container].scenarios.length;
            data[key].timeline[container].failed = data[key].timeline[container].scenarios.filter((ele:any)=>ele.result=='failed').length;
            if (start_time == ""){
              start_time = data[key].timeline[container].start_time;
            }else{
              if (start_time > data[key].timeline[container].start_time){
                start_time = data[key].timeline[container].start_time
              }
            }
            if (end_time == ""){
              end_time = data[key].timeline[container].end_time;
            }else{
              if (end_time < data[key].timeline[container].end_time){
                end_time = data[key].timeline[container].end_time;
              }
            }
            if (container.length == 10){
              timeline.name = container.substring(0,9) + '0' + container[9];
            }else{
              timeline.name = container;
            }           
            
            timelines.push(timeline);
          }
          for (let ticket of cases_data.data.data){
              if (ticket.data.scenarios.length == 0 && ticket.data.passed_tests){
                passed_jiras_list?.push(ticket.data.id);
                passed_jiras++;
              }
              if (ticket.data.scenarios.length == 0 && !ticket.data.passed_tests){
                moved_jiras++;
              }
          }
          env_data.timelines.duration = ((new Date(end_time)).getTime() - (new Date(start_time)).getTime())/1000;
          env_data.timelines.containers = timelines;
          env_data.timelines.start_time = start_time;          
          env_data.timelines.end_time = end_time;     
          env_data.passed_jiras_list = passed_jiras_list;
          env_data.passed_jiras = passed_jiras;          
          env_data.moved_jiras = moved_jiras; 
          env_data.checked_cases = env_check_cases;  
          env_data.version = data[key].version;                      
          env_data.timelines.containers.sort((a:any,b:any)=>((a.end_time > b.end_time)?1:((b.end_time > a.end_time)?-1:0)))
        }        
        var summary_data = {name:data[key].Env,data:data[key].summary};
        summary_data.data.sort((a:any,b:any)=>(a["Started on"] > b["Started on"])?1:((b["Started on"] > a["Started on"])?-1:0))
        this.summarys.push(summary_data);     
        env_data.summary =  summary_data.data[summary_data.data.length - 1];
        this.data.push(env_data); 
      }
      this.data.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));  
      this.expandNode();
      this.summarys.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));
      console.log(this.data);
      this.initialized = true;      
      document.getElementById("loading_mask")!.style.display = "none";  
      this.setReportData();    
      if (this.configure && this.configure.task_job){
        var job_url = this.configure.task_job + "/api/json";
        this.dataService.getData(job_url).subscribe((data)=>{
          this.configure.task_build = data.lastSuccessfulBuild.number;
        }

        );
      }
     });     
  }

  confirmTask(){

  }
  updateJiraChanges(){
    var changes = 0;
    var changedJiras = 0;
    for (let env of this.data){
      for (let case_data of env.perspectives[2].data._data._value){
        if (case_data.data.changes.length + case_data.data.removed.length > 0){
          changes += case_data.data.changes.length + case_data.data.removed.length;
          changedJiras ++;
        }        
      }
    }
    this.jiraChanges = changes;
    this.changedJiras = changedJiras;
    console.log(this.jiraChanges);
  }
  
  submitChanges(){
    var changes:any={version:this.data[this.selectIndex].summary["PORTAL VERSION"],jiras:[]};
    for (let case_data of this.data[this.selectIndex].perspectives[2].data._data._value){
      if (case_data.data.removed.length + case_data.data.changes.length > 0){
        var jira:any = {};
        jira.id = case_data.data.id
        jira.scenarios = [];
        for (let scenario_data of case_data.data.scenarios){
          if (case_data.data.removed.indexOf(scenario_data.name) < 0 ){
            jira.scenarios.push(scenario_data.name);
          }
        }
        for (let scenario_data of case_data.data.changes){
          jira.scenarios.push(scenario_data.name);
        }
        changes.jiras.push(jira);
      }
    }
    if (this.user){
      changes.user = this.user;
    }
    if (location.origin.toLowerCase().indexOf("localhost") < 0){
      var requestData = new URLSearchParams();
      requestData.append("blob",JSON.stringify(changes));
      fetch(wiki_job,{
        method:"POST",
        headers:{
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Jenkins-Crumb': this.user.crumb
        },
        body:requestData
      })
    }
    console.log(changes);
  }

  enableJiraSummary(){
    if(this.jira){
      console.log(this.jira);
      this.jira.data.selected = false;
      this.jira=null;
    }
  }

  checkScenario(jira:any,scenario:any){
    console.log(scenario);
    var index = jira.data.checked.indexOf(scenario.name)
    if ( index < 0){
      jira.data.checked.push(scenario.name);
    }else{
      jira.data.checked.splice(index,1);
    }
    
  }

  moveScenarios(jira:any,ticket:any){
    console.log(jira);  
    var target:any;
    for(let case_item of this.data[this.selectIndex].perspectives[2].data._data._value){
      if (case_item.data.id == ticket.id){  
          target = case_item;
          break;
      }
    }
    if (target){
      for (let scenario of jira.data.scenarios){
        if (jira.data.checked.indexOf(scenario.name) >= 0){
          this.moveScenario(jira,target,scenario);
          if (jira.data.removed.indexOf(scenario.name) < 0){
            jira.data.removed.push(scenario.name);
          }
        }
        
      }
      for (let scenario of jira.data.changes){
        if (jira.data.checked.indexOf(scenario.name) >= 0){
          this.moveScenario(jira,target,scenario)
        }
      }
      jira.data.checked = [];
    }
    this.updateJiraChanges();
  }
  
  moveScenario(source:any,target:any,scenario:any){
    if (target.data.scenarios.indexOf(scenario) >= 0){
      if (target.data.removed.indexOf(scenario.name) >= 0){
        target.data.removed.splice(target.data.removed.indexOf(scenario.name),1);
      }
    }else{
      if (target.data.changes.indexOf(scenario) < 0){
        target.data.changes.push(scenario);
        scenario.data.changed = true;
      }
    }
    if (scenario.data.jiras.indexOf(source.data.id) >=0 && scenario.data.removed.indexOf(source.data.id) <0){
      scenario.data.removed.push(source.data.id);
    }
    if (scenario.data.removed.indexOf(target.data.id)>=0){
      scenario.data.removed.splice(scenario.data.removed.indexOf(target.data.id),1);      
    }else{
      if (scenario.data.changes.indexOf(target.data.id)<0 && scenario.data.jiras.indexOf(target.data.id)<0){
        scenario.data.changes.push(target.data.id);
      }
    }    
  }

  isRemoved(jira:any,scenario:string){
    return jira.data.removed.indexOf(scenario)>=0; 
  }

  removeScenarios(jira:any){
    if (!jira.data.existing){
      jira.data.existing = [];
      for (let scenario of jira.data.scenarios){
        jira.data.existing.push(scenario.name);
      }
    }
    if (!jira.data.scenario_dict){
      jira.data.scenario_dict = {};
      for (let scenario of jira.data.scenarios){
        jira.data.scenario_dict[scenario.name] = scenario;
      }
    }
    for (let scenario of jira.data.checked){
      if (jira.data.removed.indexOf(scenario) < 0 && jira.data.existing.indexOf(scenario) >=0 ){
        jira.data.removed.push(scenario);
      }
      var scenario_data = jira.data.scenario_dict[scenario];
      if (!scenario_data){
        var index = 0;
        for (let scenario_item of jira.data.changes){
          if(scenario_item.name == scenario){
            scenario_data = scenario_item;
            break;
          }
          index++;
        }
        if (index < jira.data.changes.length){
          jira.data.changes.splice(index,1);
        }  
      }
      if (scenario_data){
        if (scenario_data.data.jiras.indexOf(jira.data.id) >=0){
          scenario_data.data.removed.push(jira.data.id);
        }
        if (scenario_data.data.changes.indexOf(jira.data.id) >=0){
          scenario_data.data.changes.splice(scenario_data.data.changes.indexOf(jira.data.id),1);
        }
      }
    }
    jira.data.checked = [];
    this.updateJiraChanges();
  }

  updateContextChecked(context:any){    
    for(let container of  context.containers){
      container.checked = context.checked;
    }
    this.containerDetail(this.data[this.selectIndex].timelines);
  }
  assignNode(jira:any){
    console.log(this.frontend);
    console.log(jira);
    if (this.user && this.user.id in this.owner_list){
      this.assignTask(this.owners[this.user.id].user);
    }else{
      this.assignTask(this.owners["liuxia01"].user);
    }
    var cases = this.frontend.node.data.case_list;
    var jira_id = jira.id;
    if (this.frontend.node.data.jiras.indexOf(jira.id) <0){
      this.frontend.node.data.changes.push(jira.id);
    }else{
      if(this.frontend.node.removed.indexOf(jira.id) >=0){
        this.frontend.node.removed.splice(this.frontend.node.removed.indexOf(jira.id),1);
      }
    }
    
    for(let case_item of cases){
      if (case_item.name.indexOf(jira_id) >=0){
        case_item.data.changes.push(this.frontend.node)        
        this.frontend.node.data.changed = true;
      }
    }
    this.updateJiraChanges();
  }

  setTimelineValue(){
    var value = this.data[this.selectIndex].timelines.value;
    var start_time = new Date(this.data[this.selectIndex].timelines.start_time+".000+00:00");
    start_time.setTime(start_time.getTime() + value * 1000);
    var current_time = start_time.toISOString().replace('T', ' ').replace('Z','');
    var timelines = this.data[this.selectIndex].timelines;
    var contexts:any = {}
    timelines.context_list=[];
    for(let container of timelines.containers){
      container.visible = false;
      if(container.start_time <= current_time && container.end_time >= current_time){
        container.visible = true;
        for (let scenario of container.scenarios){
          if(scenario.start_time <= current_time && scenario.end_time >= current_time){
            container.scenario = scenario;
            for(let context of scenario.contexts){
              if(context.start_time <= current_time && context.end_time >= current_time){
                container.context = context;
                if (!(container.context.name in contexts)){
                  var context_item = {"name":container.context.name,"checked":false,containers:[container]};
                  contexts[container.context.name] = context_item;
                  timelines.context_list.push(context_item);
                }else{
                  contexts[container.context.name].containers.push(container);
                }
                break;
              }
            }
            break;
          }
        }  
      }
    }
    this.data[this.selectIndex].timelines.current_time = current_time.split(".")[0];

  }
  formatLabel(value: number): string {
    return this.data[this.selectIndex].timelines.current_time;
  }
  containerDetail(timelines:any){
    console.log(timelines);
    if(timelines.containers.filter((ele:any)=>ele.checked).length > 0){
      this.data_type='timeline';
    }else{
      this.data_type='report';
    }
  }
  gotoError(){
    document.getElementById("error_step_id")?.scrollIntoView(false);
  }

  setCurrentTime(){
    var timelines = this.data[this.selectIndex].timelines;
    if (timelines.current_time < timelines.start_time){
      timelines.current_time = timelines.start_time.split(".")[0];
    }
    if (timelines.current_time > timelines.end_time){
      timelines.current_time = timelines.end_time.split(".")[0];
    }
    var start_time = new Date(timelines.start_time+".000+00:00");
    var current_time = new Date(timelines.current_time+".000+00:00");
    timelines.value = (current_time.getTime() - start_time.getTime())/1000;
    this.setTimelineValue();
  }

  setTimeline(){
    var env_data=this.data[this.selectIndex];
    this.data_type = "report";
    this.report_name = "containers running duration chart";      
    this.lineChartData.labels = [];
    this.lineChartData.datasets = [];
    this.headers = env_data.timelines.headers;      
    var color = 'black';
    var end_times = [];
    for (let item of env_data.timelines.containers){
      var start_time = new Date(item.start_time);
      this.lineChartData.labels.push(item.name);
      if (item.color){
        color = item.color;
      }
      var end_time = new Date(item.end_time);
      if (!item.duration){
        item.duration = (end_time.getTime() - start_time.getTime())/60000;
      }      
      end_times.push(item.duration);
    }
    var dataset = {data:end_times,
      label: "Duration (mins)",
      fill: false,
      tension: 0,
      borderColor: color,
      backgroundColor: 'rgba(255,0,0,0.3)'
    }
    this.lineChartData.datasets=[dataset]
    console.log(this.chart);      
    this.updateReportChart();
    this.datasources=env_data.timelines.containers;
    this.setTimelineValue();

  }
  setWorkspace(workspace:string){
    this.workspace = workspace;
    if(workspace == 'Timeline'){
      this.setTimeline();
    }
    if(workspace == 'Jiras'){
      this.data_type='jira';
    }
  }
  expandNode(){
    var env_index = 0;
    if(this.test_id != "") {
      for (let env_data of this.data){
        var cucumber_test = env_data.perspectives[0].data;
        var auto_test = cucumber_test._data._value[1];
        for (let job of auto_test.children){
          for(let feature of job.children){
            for(let scenario of feature.children){
              if (scenario.data.url.indexOf(this.test_id) > 0){                
                this.treeControl.expand(auto_test);
                this.treeControl.expand(job);
                this.treeControl.expand(feature);
                this.selectNode(scenario);
                this.selectIndex = env_index
                return
              }
            }
          }
        }
        env_index++;
      }  
    }
  }

  getPageNode(page_name:string,page_data:any,scenarios:any){
    var page_node:TestNode = {name:page_name,data:{scenarios:0,jira_number:0},children:[]};
    var page_jira_number = 0;
    if (page_data.scenarios){
      for(let scenario of page_data.scenarios){
        var scenario_node = scenarios[scenario.name];
        page_node.children?.push(scenario_node);
        if (scenario.data.JIRA){
          page_jira_number++;
        }
      } 
      page_node.data.scenarios = page_data.scenarios.length;
      page_node.data.jira_number = page_jira_number;
    }
    for (let child in page_data){
      if (child != "scenarios"){
        var child_data = page_data[child];
        var child_node = this.getPageNode(child,child_data,scenarios)
        page_node.children?.push(child_node);
        page_node.data.scenarios += child_node.data.scenarios;
        page_node.data.jira_number += child_node.data.jira_number;
      }
    }
    page_node.name = page_node.name + "(" + page_node.data.jira_number + "/" + page_node.data.scenarios + ")"
    return page_node;
  }
  hasChild = (_: number, node: TestNode) => !!node.children && node.children.length > 0;
  title = 'qa_auto';
  selectNode(node:any){
    this.clearNodes();
    console.log(node);
    node.data.selected=true;
    var test_data = [];
    if (node.data.type && node.data.type == 'report'){
      this.data_type = 'report';      
      this.report_name = node.data.report_name + " - " + node.name;      
      this.lineChartData.labels = [];
      this.lineChartData.datasets = [];
      this.headers = [];
      for (let key in node.data.data[0]){
        this.headers.push(key);
      }
      var color = 'black';
      for (let item of node.data.data){
        this.lineChartData.labels.push(item.build);
        if (item.color){
          color = item.color;
        }
        test_data.push(item[node.data.report]);
      }
      var dataset = {data:test_data,
        label: node.data.report,
        fill: false,
        tension: 0,
        borderColor: color,
        backgroundColor: 'rgba(255,0,0,0.3)'
      }
      this.lineChartData.datasets=[dataset]
      console.log(this.chart);      
      this.updateReportChart();
      this.datasources=node.data.data;
    }else if(node.data.type && node.data.type == 'jira'){
      this.data_type = 'jira';
      this.new_jira = null;
      this.jira = node;
      console.log(this.jira);
    }
    else{
      this.data_type = 'test';
      var id_names= node.data.url.split("/");
      if (window.parent){
        window.parent.location.hash = id_names[id_names.length - 1].split(".")[0];
      }else{
        window.location.hash = id_names[id_names.length - 1].split(".")[0];
      }    
      this.dataService.getData(node.data.url).subscribe({next:(data)=>{
        node.data.data=data;
        this.setData(node)
      },error: ()=>{window.location.reload()}
      }
      );

    }
  }

  searchPerspective(perspective:any){
    if(perspective.search){
      perspective.search = perspective.search.trim();
      var test_data=perspective.data;
      if (perspective.name == "Tests"){
        var auto_test = test_data._data._value[1];
        for (let job of auto_test.children){
          for(let feature of job.children){
            for(let scenario of feature.children){
              if (scenario.name.indexOf(perspective.search) >= 0){
                this.treeControl.collapseAll();
                this.treeControl.expand(auto_test);
                this.treeControl.expand(job);
                this.treeControl.expand(feature);
                this.selectNode(scenario);                
                return
              }
            }
          }
        }
      }else{
        for(let node of test_data._data._value){
          var search_res = this.searchNode(node,perspective.search)
          if(search_res){
            this.treeControl.collapseAll();
            for (var i = 0; i < search_res.length - 1; i++){
              this.treeControl.expand(search_res[i]);
            }
            this.selectNode(search_res[search_res.length-1]);
          }
        }
      }
    }
  }
  searchNode(node:any,search:string):any{
    if (node.children.length >0){
      for (let child of node.children){
        var search_res = this.searchNode(child,search)
        if (search_res){
          search_res.unshift(node);
          return search_res;
        }
      }
    }else{
      if (node.name.indexOf(search) >=0){
        return [node]
      }
    }    

  }
  copyLink(){
    var link = document.querySelector("#frontend_test_name");
    const range = document.createRange();
    if(link){
      range.selectNode(link);
      const selection = window.getSelection();
      if (selection){
        selection.removeAllRanges();
        selection.addRange(range);  
      }
    }
    const successful = document.execCommand('copy');
  }
  setData(node:any){
    this.data_type='test';
    if (node.data.selected){        
        this.frontend= node.data.data;
        // this.frontend.jiras = node.data.jiras;
        this.frontend.show_log = "Show Log";
        this.frontend.show_management = "Management";
        if (node.data.owner){
          this.frontend.owner = this.owners[node.data.owner];          
        }
        if (node.data.assigned){
          this.frontend.assigned = this.owners[node.data.assigned];
        }
        this.frontend.node = node;
        if (!this.frontend.node.data.temp_comment){
          this.frontend.node.data.temp_comment ={};
          if (this.frontend.node.data.is_monitor){
            this.frontend.node.data.temp_comment.is_monitor = this.frontend.node.data.is_monitor;
          }
        }
        
        if (this.frontend.url){
          var path_items = this.frontend.url.split("//");
          var container_name = null;
          for (let container of this.data[this.selectIndex].timelines.containers){
            for (let scenario of container.scenarios){
              if (scenario.name == node.name){
                container_name = container.name;
                break;
              }
            }
            if (container_name){
              break;
            }
          }
          if (container_name){
            this.frontend.screenshots_url = path_items[0] + "//" + path_items[1] + "/artifact/screenshots-" +container_name + ".tar.gz";
          }
        }
        if (node.data.jiras){
          this.frontend.reporters = {};
          for (let jira of node.data.jiras){
            for (let ticket of this.data[this.selectIndex].jiras){
              if (ticket.id == jira){                                
                this.frontend.reporters[jira]=ticket.creator;                                
              }
            }
            
          }
        }
        if (this.frontend.img && this.frontend.img.indexOf(report_url) < 0){
          this.frontend.img = report_url + this.frontend.img;
        }
        //   this.frontend.img = "./assets/" + this.frontend.img;
        // }
        this.frontend.name = node.name;
        this.backend = [];
        if (node.data.data.user_id){
          this.test_user_id = node.data.data.user_id;
        }else{
          this.test_user_id = "";
        }
        for (let server in node.data.data.logs){
          this.backend.push({name:server,logs:node.data.data.logs[server],search:""})
        };
        console.log(this.frontend);  
  
    }

  }
  logSwitch(){
    if (this.frontend.show_log == "Show Log"){
      this.frontend.show_log = "Hide Log";
    }else{
      this.frontend.show_log = "Show Log";
    }
  }
  manageSwitch(){
    if (!this.frontend.is_managed){
      this.frontend.is_managed = true;
      this.frontend.show_management ="Hide Management";
    }else{
      this.frontend.is_managed = false;
      this.frontend.show_management ="Management";
    }
  }
  addComment(){    
    if (!this.frontend.node.data.new_comment){
      this.frontend.node.data.new_comment = {"user":this.user}
    }
    this.frontend.node.data.new_comment.is_monitor = this.frontend.node.data.temp_comment.is_monitor;
    this.frontend.node.data.new_comment.content = this.frontend.node.data.temp_comment.content;    
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    this.frontend.node.data.new_comment.datetime = localISOTime.replace("T", " ");
  }
  removeComment(){
    if (this.frontend.node.data.new_comment){
      this.frontend.node.data.new_comment = null;
    }
    if (this.frontend.node.data.temp_comment){
      this.frontend.node.data.temp_comment = {};
      this.frontend.node.data.temp_comment.is_monitor = this.frontend.node.data.is_monitor;
    }
  }
  changeEnv(_event:any){
    this.selectIndex = _event;
    if (this.data_type=="report" || this.data_type=="test"){
      this.setReportData();
    }else{

    }
    
    if(this.workspace == 'Timeline'){
      this.setTimeline();
    }
    
  }
  changeSearch(){
    console.log(this.backend);
  }
  setReportData(){
    this.data_type = 'report';
    var summary = this.summarys[this.selectIndex];
    this.report_name = this.summarys[this.selectIndex].name + " test report";
    var failed_data = [];
    var total_data = [];
    this.lineChartData={labels:[],datasets:[]};
    this.headers=[];
    for (let column in summary.data[0]){
      this.headers.push(column);
    }
    this.datasources = summary.data;
    for (let item of summary.data){
      this.lineChartData.labels?.push(item["Started on"])
      failed_data.push(item.failed);
      total_data.push(item.Scenarios)
    }
    var dataset = {data:failed_data,
      label: 'Failed Tests',
      fill: false,
      tension: 0,
      borderColor: 'red',
      backgroundColor: 'rgba(255,0,0,0.3)'
      }
    var totalset = {data:total_data,
      label:"Total Tests",
      fill: false,
      tension: 0,
      borderColor: 'black',
      backgroundColor: 'rgba(255,0,0,0.3)'

    }
    this.lineChartData.datasets = [dataset,totalset];
    this.chart?.chart?.update();      
  }
  updateReportChart(){
    this.lineChartOptions = {...this.lineChartOptions};
  }
  clearNodes(){
    this.test_user_id = "";
    for (let env_data of this.data){
      for (let perspective of env_data.perspectives){
        for(let test of perspective.data.data){
          if (test.name.indexOf("Automation Test") >=0 || perspective.name == "Pages"){
              for(let job of test.children){
                for(let feature of job.children){
                  for(let scenario of feature.children){
                    scenario.data.selected=false;
                  }
                  if(feature.data){
                    feature.data.selected=false;
                  }
                }
                if (job.data){
                  job.data.selected=false;
                }
              }
          }else if (perspective.name != "Tests"){
            test.data.selected = false;
          }
          else{
            for (let scenario of test.children){
              scenario.data.selected=false;
            }
          }
        }  
      }
    }
  }
  openContainer(container:any){
    var context = container.scenarios[0].contexts[0];
    if (!context.steps || context.steps.length == 0){
      this.dataService.getData(container.url).subscribe({next:(data)=>{
        for (var i=0; i <= container.scenarios.length -1;i++){
          for(var j=0; j < container.scenarios[i].contexts.length;j++){
             container.scenarios[i].contexts[j].steps = data.scenarios[i].contexts[j].steps
          }
        }
      },error: ()=>{window.location.reload()}
      }
      );

    }
  }

  setTask(tasks:any,scenario_data:any){
    var owner_name = this.owners[scenario_data.data.assigned].user + "'s task";
    scenario_data.data.assigned = this.owners[scenario_data.data.assigned].user;
    for (let task of tasks){
      if (task.name == owner_name){
        task.children.push(scenario_data)
        task.data.scenarios.push(scenario_data)
        if (scenario_data.data.jiras){
          for(let jira of scenario_data.data.jiras){
            if (!(jira in task.data.jiras)){
              task.data.jiras.push(jira);
            }
          }
        }
        return;
      }
    }

    var owner:TestNode = {name:owner_name,children:[scenario_data],data:{scenarios:[scenario_data],removed:[],changes:[],jiras:[]}}
    if (scenario_data.data.jiras){
      for (let jira of scenario_data.data.jiras){
        owner.data.jiras.push(jira);
      }      
    }
    tasks.push(owner);
    return;

  }
  showTask(node:any){
    console.log(node);
    this.task = {}
    this.task.scenario_list = []
    this.task.jira_list = [];
    this.task.removed = node.data.removed;
    this.task.passed_jiras = [];
    this.data_type="tasks";
    this.task.name = node.name
    for (let scenario of node.data.scenarios){
      var item:any = {};
      item.name = scenario.name;
      item.url = scenario.data.url;
      item.jiras = scenario.data.jiras;
      if (item.jiras){
        item.status = "checked";
      }
      if (scenario.data.monitored){
        item.status = "monitored";
      }
      for (let removed_item of node.data.removed){
        if (removed_item.name == scenario){
          item.status = "removed";
          break;
        }
      }
      this.task.scenario_list.push(item);
    }
    for (let scenario of node.data.changes){
      var item:any = {};
      item.name = scenario.name;
      item.url = scenario.data.data.url;
      item.jiras = scenario.data.jiras;
      if (item.jiras && item.jiras.length > 0){
        item.status = "checked";
        for (let jira in item.jiras){
          if (jira in this.data[this.selectIndex].passed_jiras_list && !(jira in this.task.passed_jiras)){
            this.task.passed_jiras.push(jira);
          }
          if (!(jira in this.task.jiras )){
            this.task.jiras.push(jira);
          }
        }
      }
      if (scenario.data.monitored){
        item.status = "monitored";
      }
      item.updated = true;
      this.task.scenario_list.push(item);
    }
  }
  assignTask(owner:any){
    console.log(owner);
    var task_name = owner + "'s task";
    var tasks = this.data[this.selectIndex].perspectives[3].data.data;
    var scenario_data = this.frontend.node;
    var srcTask,dstTask;
    var src_task_name;
    if (scenario_data.data.assigned){
      src_task_name = scenario_data.data.assigned + "'s task";
    }
    scenario_data.data.assigned = owner;
    this.frontend.assigned = owner;
    this.taskChanges = 0;
    for (let task of tasks){
      if (task.name == task_name){
        task.children.push(scenario_data)              
        dstTask = task;
        if (scenario_data in dstTask.data.scenarios){
          dstTask.data.removed = dstTask.data.removed.filter((item:TestNode)=>item.name!==scenario_data.name);
        }else{
          dstTask.data.changes.push(scenario_data);
        }  
        
      }    
      if (task.name == src_task_name){
        srcTask = task;
        task.children = task.children.filter((item:TestNode)=>item.name!==scenario_data.name);
        var found = false;
        for (let scenario of srcTask.data.scenarios){
          if (scenario.name == scenario_data.name){
              found = true;
              break;
          }
        }
        if (found){
          srcTask.data.removed.push(scenario_data);
        }else{
          srcTask.data.changes = srcTask.data.changes.filter((item:TestNode)=>item.name!=scenario_data.name);
        }  
        if (scenario_data.jiras){
          this.removeJiraTask(scenario_data,srcTask);
        }
      }
      this.taskChanges += task.data.removed.length + task.data.changes.length;
    }    
    if (srcTask){
      var task:TestNode = {name:srcTask.name,children:srcTask.children,data:srcTask.data}
      tasks = tasks.map((t:TestNode)=>t.name !== task.name? t:task)
    }
    if (!dstTask){
      var task:TestNode = {name:task_name,children:[scenario_data],data:{scenarios:[],changes:[scenario_data],removed:[],jiras:[]}}
      this.taskChanges++;
      tasks.push(task);
    }else{
      var task:TestNode = {name:dstTask.name,children:dstTask.children,data:dstTask.data}
      tasks = tasks.map((t:TestNode)=>t.name !== task.name? t:task)
    }
    this.data[this.selectIndex].perspectives[3].data.data = tasks ;
    

    return;
  }
  removeJiraTask(scenario_data:any,task:any){
    var task_scenario_list:any[] = [];
    for (let scenario of task.data.scenarios){
      task_scenario_list.push(scenario.name);
    }
    for (let scenario of task.data.changes){
      task_scenario_list.push(scenario.name);
    }
    task_scenario_list = task_scenario_list.filter((item:any)=>!(item.name in task.data.removed))

    if (scenario_data.data.jiras){
      var removed_jiras:any[] = []
      for(let jira of scenario_data.data.jiras){
        var case_data:any = null;
        for(let ticket of this.data[this.selectIndex].perspectives[2].data._data._value){
          if (ticket.name ==jira){
            case_data = ticket;
            break;
          }
        }
        if (case_data){
          var scenario_list = [];
          for (let scenario of case_data.data.scenarios){
            scenario_list.push(scenario.name);
          }
          for (let scenario of case_data.data.changes){
            scenario_list.push(scenario.name);
          }
          scenario_list = scenario_list.filter((item:any)=>!(item.name in case_data.data.removed))
          scenario_list = scenario_list.filter((item:any)=>(item.name in task_scenario_list))
          if(scenario_list.length == 0){
            removed_jiras.push(case_data.name)
          }
        }
      }
      if (removed_jiras.length > 0){
        task.data.jiras = task.data.jiras.filter((item:any) => (item in removed_jiras));
      }
    }

  }
  addJira(){
    this.jira=null;
    this.new_jira={id:"",summary:""};
  }
  updateJira(){
    this.new_jira={id:this.jira.data.id,summary:this.jira.data.summary,previous:this.jira};
    this.jira = null;
  }
  assignJira(){
    this.data_type = "jira";
    this.jira=null;
    var description = "AUTO Test -- " + this.frontend.node.name  + " -- failed in Env " + this.data[this.selectIndex].name + " on version : " + this.data[this.selectIndex].version + "\n";
    description += "The details could be found on url : " + this.frontend.url +"\n";
    if (this.frontend.node.data.last_success_test){
      description += "The last success test was performed on " + this.frontend.node.data.last_success_test.test_time + "and version "
       + this.frontend.node.data.last_success_test.version + "\n";       
      description += "The passed test detail could be found on the url : " + this.frontend.node.data.last_success_test.url;
    }
    var steps = "";
    for (let step of this.frontend.steps){
      if (step.result == "passed" || step.result == "failed"){
        if (step.result == "passed"){
          steps += step.name + "\n";
        }else{
          steps += "*"+step.name + "(failed)*\n";
        }
        
        if (step.table){
          for (let item of step.table[0]){
            steps += "||" + item;
          }
          steps += "||\n";
          for (var i = 1; i < step.table.length; i++){
            for (let item of step.table[i]){
              if (item.length > 0){
                steps += "|" + item;
              }else{
                steps += "| ";
              }
              
            }
            steps +="|\n";
          }
          
        }
      }      
    }
    this.new_jira={id:"",summary:"",scenario:this.frontend.node,description:description,steps:steps};
  }
  saveJira(){
    var jira = this.new_jira;
    if (jira.previous){
      var previous_id = jira.previous.data.id;
      jira.previous.data.id = jira.id;
      jira.previous.data.summary = jira.summary;
      jira.previous.name = jira.id + ":" + jira.summary;
      var old = this.data[this.selectIndex].jiras[jira.previous.data.index];
      old.id = jira.id;
      old.summary = jira.summary;
      for (let scenario of jira.previous.data.changes){
        var index = scenario.data.changes.indexOf(previous_id);
        if (index >= 0){
          scenario.data.changes[index] = jira.id;
        }
      }
      this.jira = jira.previous;
      this.new_jira = null;
    }else{
      var vers = this.data[this.selectIndex].version.split(".")
      jira.version = vers[0] + "." + vers[1];
      if (jira.is_new){
        var i = 1;
        if (jira.project in this.jira_index){
          i = this.jira_index[jira.project] + 1;                  
        }
        this.jira_index[jira.project] = i;
        jira.id = "NEW_" + jira.project + "_" +i;
      }
      this.data[this.selectIndex].jiras.push(jira);
      var case_data:TestNode ={name:jira.id+":"+jira.summary,children:[],data:{
        id:jira.id,summary:jira.summary,scenarios:[],changes:[],checked:[],removed:[],existing:[],jiras:this.data[this.selectIndex].jiras,type:"jira",
        scenario_text:jira.scenario_text,passed_tests:jira.passed_tests,is_added:true,is_new:jira.is_new,index:this.data[this.selectIndex].jiras.length -1
      }};          
      if (jira.is_new){
        case_data.data.description = jira.description;
        case_data.data.team = jira.team;
        case_data.data.steps = jira.steps;
        case_data.data.project = jira.project
      }
      var case_datas = this.data[this.selectIndex].perspectives[2].data.data;
      case_datas.unshift(case_data);
      this.data[this.selectIndex].perspectives[2].data.data = case_datas;
      this.new_jira=null;
      this.jira = case_data;
      if(jira.scenario){
        this.assignNode(this.data[this.selectIndex].jiras[case_data.data.index]);
        this.data_type="test";
      }
    }
  }
  sortData(sort:Sort){
    const data = this.datasources.slice();
    this.datasources = data.sort((a:any, b:any) => {
      const isAsc = sort.direction === 'asc';
      return this.compare(a[sort.active],b[sort.active],isAsc);
    });

  }
  compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
  validate(){
    if (this.new_jira){
      if(this.new_jira.is_new){
        if (this.new_jira.project && this.new_jira.description && this.new_jira.summary && this.new_jira.steps){
          if(this.new_jira.project?.length > 0 && this.new_jira.description?.length > 0&& this.new_jira.summary?.length > 0
            && this.new_jira.steps?.length >0){
              return true;
            }
  
        }
      }else{
        if(this.new_jira.id && this.new_jira.summary && this.new_jira.id?.length >0 && this.new_jira.summary?.length > 0){
          return true;
        }
      }      
    }
    return false;
  }
}
