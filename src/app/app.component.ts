import { ApplicationInitStatus, APP_INITIALIZER, Component, Inject, OnInit,ViewChild,Renderer2   } from '@angular/core';
import { DataService } from './data.component';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { clipArea } from 'chart.js/dist/types/helpers/helpers.canvas';

declare var report_url: any,jira_url:any;
interface TestNode {
  name: string;
  children?: TestNode[];
  data?:any;
}



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  @ViewChild(BaseChartDirective) 
  public chart: BaseChartDirective | undefined;
  data:any;
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
  test_user_id:string = "";
  test_id:string = "";
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
    this.dataService.getJSON().subscribe(data=>{
      this.data = [];
      this.summarys = [];           
      for(let key in data){
        
        var context_data = {name:"Pages",data:new MatTreeNestedDataSource<TestNode>(),selected:false, search:""};
        var cucumber_data = {name:"Tests",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};
        var cases_data = {name:"Jiras",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};
        var tests:TestNode[] = [];
        var pages:TestNode[] = [];
        var cases:TestNode[] = [];
        for (let jira of data[key].jiras){
          var case_data:TestNode ={name:jira.id+":"+jira.summary,children:[],data:{scenarios:[],changes:[],jiras:data[key].jiras,type:"jira"}};
          cases.push(case_data);
        }
        cases_data.data.data=cases;
        for (let page in data[key].context){
          var page_data = data[key].context[page];
          if ( page != "scenarios"){
            var page_node = this.getPageNode(page,page_data);
            pages.push(page_node);  
          }
        }
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
                  if (feature_data.children){
                    feature_data.children.push(scenario_data);
                  }              
                  if (this.test_id != "" && scenario_data.data.url.indexOf(this.test_id) > 0){
                    expand_nodes["feature"] = feature_data;
                    expand_nodes["job"] = job_data;                                                            
                  }
                  if(scenario_data.data.JIRA){
                    feature_checked_cases++;                    
                  }
                  scenario_data.data.jiras = [];
                  scenario_data.data.case_list = cases;
                  for (let jira of data[key].jiras){
                    if (jira.id != scenario_data.data.JIRA){
                      scenario_data.data.jiras.push(jira);
                    }else{
                      for (let case_item of cases){
                        if (case_item.name.indexOf(jira.id)>=0){
                          case_item.data.scenarios.push(scenario_data);
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
        cucumber_data.data.data = tests;
        if (this.test_id != ""){
          this.treeControl.expand(cucumber_data);
        }
        context_data.data.data = pages;
        var env_data = {name:data[key].Env,perspectives:[cucumber_data,context_data,cases_data],selected:false,jiras:[],
            timelines:{containers:[],start_time:"",end_time:"",duration:0,value:0,headers:['name','start_time','end_time','total','failed'],data_source:[]}};
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
            timeline.name = container;
            timelines.push(timeline);
          }
          env_data.timelines.duration = ((new Date(end_time)).getTime() - (new Date(start_time)).getTime())/1000;
          env_data.timelines.containers = timelines;
          env_data.timelines.start_time = start_time;
          env_data.timelines.end_time = end_time;                              
          env_data.timelines.containers.sort((a:any,b:any)=>((a.end_time > b.end_time)?1:((b.end_time > a.end_time)?-1:0)))
        }
        this.data.push(env_data); 
        var summary_data = {name:data[key].Env,data:data[key].summary};
        summary_data.data.sort((a:any,b:any)=>(a["Started on"] > b["Started on"])?1:((b["Started on"] > a["Started on"])?-1:0))
        this.summarys.push(summary_data);      
      }
      this.data.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));  
      this.expandNode();
      this.summarys.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));
      this.initialized = true;      
      document.getElementById("loading_mask")!.style.display = "none";  
      this.setReportData();    
     });     
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
    var cases = this.frontend.node.data.case_list;
    var jira_id = jira.id;
    for(let case_item of cases){
      if (case_item.name.indexOf(jira_id) >=0){
        case_item.data.changes.push(this.frontend.node)
        this.frontend.node.data.changed = true;
      }
    }

  }

  setTimelineValue(value:number){
    this.data[this.selectIndex].timelines.value = value;
  }
  formatLabel(value: number): string {
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
    this.data[this.selectIndex].timelines.current_time = current_time;
    return current_time;
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

  setTimeline(){
    var env_data=this.data[this.selectIndex];
    this.data_type = "report";
    this.report_name = "containers running end time chart";      
    this.lineChartData.labels = [];
    this.lineChartData.datasets = [];
    this.headers = env_data.timelines.headers;      
    var color = 'black';
    var end_times = [];
    var start_time = new Date(env_data.timelines.start_time);
    for (let item of env_data.timelines.containers){
      this.lineChartData.labels.push(item.name);
      if (item.color){
        color = item.color;
      }
      var end_time = new Date(item.end_time);
      var duration = (end_time.getTime() - start_time.getTime())/1000;
      end_times.push(duration);
    }
    var dataset = {data:end_times,
      label: "End Time",
      fill: false,
      tension: 0,
      borderColor: color,
      backgroundColor: 'rgba(255,0,0,0.3)'
    }
    this.lineChartData.datasets=[dataset]
    console.log(this.chart);      
    this.updateReportChart();
    this.datasources=env_data.timelines.containers;

  }
  setWorkspace(workspace:string){
    this.workspace = workspace;
    if(workspace == 'Timeline'){
      this.setTimeline();
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

  getPageNode(page_name:string,page_data:any){
    var page_node:TestNode = {name:page_name,data:{scenarios:0,jira_number:0},children:[]};
    var page_jira_number = 0;
    if (page_data.scenarios){
      for(let scenario of page_data.scenarios){
        var scenario_node:TestNode = {name:scenario.name,data:scenario.data,children:[]};
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
        var child_node = this.getPageNode(child,child_data)
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
        this.frontend.jiras = node.data.jiras;
        this.frontend.show_log = "Show Log";
        this.frontend.node = node;
        if (node.data.JIRA){
          this.frontend.jira = node.data.JIRA;
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
  changeEnv(_event:any){
    this.selectIndex = _event;
    this.setReportData();
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
}
