import { ApplicationInitStatus, APP_INITIALIZER, Component, Inject, OnInit,ViewChild,Renderer2, ElementRef, AfterViewInit, QueryList, ViewChildren   } from '@angular/core';
import { DataService } from './data.component';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {FormControl, AbstractControl, ValidationErrors, ValidatorFn,FormGroupDirective, NgForm, Validators} from '@angular/forms';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import {Sort, MatSortModule} from '@angular/material/sort';
import {ErrorStateMatcher} from '@angular/material/core';
import { Observable, map, startWith } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogChangeDialog } from './dialog.component';
import { getBadgeText, getErrorBadgeText, getExpectedDupicates, getExpectedError, ScenarioComponent } from './scenario.component';
import { SummaryComponent } from './summary.component';

declare var report_url: any,jira_url:any;
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
export class AppComponent implements OnInit, AfterViewInit  {
  
  @ViewChild(BaseChartDirective)
  barChartType:ChartType = 'bar';
  public chart: BaseChartDirective | undefined;
  accountCtrl = new FormControl('');
  filteredAccounts: Observable<string[]>;
  testTimeControl = new FormControl('',{validators:[timeFormatValidator()],updateOn:'change'});
  @ViewChild('accountInput') accountInput: ElementRef<HTMLInputElement>;
  data:any;
  matcher = new MyErrorStateMatcher();
  jiraChanges = 0;
  taskChanges = 0;
  changedJiras = 0;
  changeErrors = 0;
  changeDuplicates = 0;
  submit = false;
  summary_list = ['Jiras','Errors','Duplicates'];
  search_list = ['Tests','Pages','Tasks','Errors','Duplicates'];
  report_list = ['Tests','Pages','Tasks','Timeline'];
  update_changes = false;
  treeControl = new NestedTreeControl<TestNode>(node => node.children);
  barChartPlugins = [];
  jira_refs:any={};
  public barChartData: ChartConfiguration<'bar'>['data'] ={labels:[],datasets:[],

  };
  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true
  };
  frontend:any;
  backend:any;  
  conflict_changes:any=[];
  jira:any;
  node:any
  is_processing = false;
  data_type = "";
  build:number;
  task_build:number;
  initialized = false;
  workspace = "Tests";
  summarys : any;
  public lineChartLegend = true;
  selectIndex = 0;
  report_name = "";
  jira_url = jira_url;
  headers:string[] = [];
  datasources:any;
  jira_headers=["checked","id","summary","scenarios","comment"];
  task_headers =["scenario","jiras","status","comment"];
  configure:any;
  jira_index:any = {};
  test_user_id:string = "";
  test_id:string = "";
  user:any;
  task:any;
  owners:any;
  new_jira:any;
  owner_list:any = ["Unassigned"];
  users:any = {};
  error_message = "";
  last_build = true;
  job_url = "";
  keepAlive:any;
  infinity_calls:any=[];
  errors_cfg:any = {data:{},queues:{checked:[],removed:[],added:[]},headers:["Error","Scenario","Comment"],
  single_list:["Error"],multiple_list:["Scenario"]};
  duplicates_cfg:any = {data:{},queues:{checked:[],removed:[],added:[]},headers:["Step","Scenario","Duplicate","Comment"],
  single_list:["Step"],multiple_list:["Scenario","Duplicate"]}; 
;
  log_analysis: boolean;
  summaryPage : SummaryComponent;
  scenario : ScenarioComponent;
  @ViewChild('scenario',{static:false}) set scenarioContent(content:ScenarioComponent){
    if (content){
      this.scenario = content;
    }    
  };
  @ViewChild('summaryPage',{static:false}) set content(content:SummaryComponent){
    this.summaryPage = content;
    if (this.summaryPage){
      this.summaryPage.reset();
      console.log(this.summaryPage);
    }


   } ;

  constructor(public dialog:MatDialog, private dataService: DataService,private _renderer2: Renderer2
    ){
      this.filteredAccounts = this.accountCtrl.valueChanges.pipe(
        startWith(null),
        map((account: string | null) => (account ? this._filter(account) : this.data[this.selectIndex].timelines.account_list.slice())),
      );

    }
  ngAfterViewInit(): void {    
   
  }
  ngOnInit(){
    if (report_url && report_url.indexOf("jenkins")>0){
      var job_url = report_url.substring(0,report_url.indexOf("/Workspace")).replace(/\/+$/,"");
      var items = job_url.split("/");
      var build_n = items.pop();
      this.build = parseInt(build_n);
      this.job_url = items.join("/");
      this.checkBuild();
    }
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
        var tasks:TestNode[] = [{name:"Unassigned task",children:[],data:{scenarios:[],removed:[],changes:[],jiras:[],scenario_list:[],type:"tasks"}}];
        var passed_jiras = 0;
        var moved_jiras = 0;
        var scenarios:any = {};
        var passed_jiras_list:any = [];
        var start_test = new Date(data[key].start_time);
        if (data[key].owners){
          for (let owner in data[key].owners){
            var user = data[key].owners[owner];
            if (!(this.owners[owner])){
              this.owners[owner] = data[key].owners[owner];
              this.owner_list.push(data[key].owners[owner].user);
              this.users[user.email] = user;
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
                  if (scenario_data.data.last_success_test){
                    var test_time = new Date(scenario_data.data.last_success_test.test_time);

                    if ((start_test.getTime() - test_time.getTime())/(24*60*60*1000) >= 2){
                      scenario_data.data.error = true;
                    }
                  }else{
                    scenario_data.data.error = true;
                  }
                  if (this.test_id != "" && scenario_data.data.url.indexOf(this.test_id + ".") > 0){
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
                  scenario_data.data.work_url = report_url + "#" + scenario_data.data.url.split("/")[1].split(".")[0];
                  scenarios[scenario] = scenario_data;
                  scenario_data.data.case_list = cases;                  
                  tasks = this.setTask(tasks,scenario_data);                  
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
            timelines:{containers:[],start_time:"",end_time:"",duration:0,value:0,headers:['name','start_time','end_time','duration','total','failed'],data_source:[],selected_accounts:[]},scenarios:scenarios,};
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
              timeline.name = container.substring(0,9) + '00' + container[9];
            }else{
              if (container.length == 11){
                timeline.name = container.substring(0,9) + '0' +  container.substring(9);
              }else{
                timeline.name = container;
              }              
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
          env_data.start_time = data[key].start_time;
          env_data.end_time = data[key].end_time;
          env_data.timelines.containers.sort((a:any,b:any)=>((a.name > b.name)?1:((b.name > a.name)?-1:0)))
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
      this.setJiraRefs();
      this.fetchTasks();
      this.fetch_log_analysis();
     });
     if (location.origin.toLowerCase().indexOf("localhost") < 0){
      this.keepAlive = setInterval(this.checkTaskVersion.bind(this),30000);
     }    
     
  }

  pass_test(node:any){
    var failed_tests = 0
    if (node.data.jira_ref){
      for(let env_node of node.data.jira_ref){
        failed_tests += env_node.scenarios.length + env_node.changes.length - env_node.removed.length;
      }
      return failed_tests == 0;
    }
    return false;
  }

  checkBuild(){
    this.dataService.getData(this.job_url+"/lastBuild/api/json").subscribe((data)=>{
      if (data.number == this.build){
        this.last_build = true;
      }else{
        this.last_build = false;
        this.error_message = "The test result of the current workspace is out of date. Please submit the changes against the result of build " + data.number;
      }
    })
  }
  fetchTasks(){
    if (this.configure && this.configure.task_job && location.origin.indexOf("local")<0){
      var job_url = this.configure.task_job + "/lastBuild/api/json";
      this.dataService.getData(job_url).subscribe((data)=>{
        this.configure.task_build = data.number;
        this.is_processing = data.inProcess||data.building;
        if (data.result != "SUCCESS"){
          this.error_message = "Management jenkins job got some issue. Please contact admin!";
          this.last_build = false;
          return
        }
        if(this.is_processing){
          setTimeout(this.fetchTasks,5000);
        }else{
          var task_url = this.configure.task_job + "/tasks/tasks.json";
          this.dataService.getData(task_url).subscribe((data)=>{
            this.loadTasks(data);
          })
        }  
      }
      );
    }else{
      this.dataService.getData("/tasks.json").subscribe((data)=>{
        this.loadTasks(data);
        console.log(this.data);
      })

    }
  }

  fetch_log_analysis(){
    if (location.href.indexOf("localhost") >=0){
      this.configure.log_analysis_url = "/assets/";
      for(let envData of this.data){
        var log_analysis_url = "/assets/" + envData.name + "_";
        this.dataService.getZip(log_analysis_url + "log_analysis.zip",envData.name + "_log_analysis.json").then((data)=>{
          this.loadLogAnalysis(data);    })
  
      }
  
    }else{
      
      if (this.configure.log_analysis && this.configure.log_analysis.build){
        this.dataService.getData(this.configure.log_analysis.job+"/lastBuild/api/json").subscribe((data)=>{
          this.configure.log_analysis.lastBuild = data.number;
          this.configure.log_analysis_url = this.configure.log_analysis.job + "/" + this.configure.log_analysis.build + "/tasks/";
          for (let envData of this.data){
            var log_analysis_url = this.configure.log_analysis_url + envData.name  + "_";
            this.dataService.getZip(log_analysis_url+ "log_analysis.zip",envData.name +"_log_analysis.json").then((data)=>{
              this.loadLogAnalysis(data);    }).catch((e)=>{
                if (this.configure.log_analysis.build < this.configure.log_analysis.lastBuild){
                  this.configure.log_analysis.build++;
                  this.fetch_log_analysis();                
                }
              });
  
          }
  
        });
      }
    }

  }
  loadLogAnalysis(data:any){
    console.log(data);
    var envData = data;
    
      for (let env of this.data){
        if (envData.env == env.name && (env.end_time.indexOf(envData.test_date)>=0 || location.origin.indexOf("local")>0)){
          this.log_analysis = true;
          if (env.perspectives.length == 4){
            var errorData = {name:"Errors",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};            
            var duplicatedData = {name:"Duplicates",data:new MatTreeNestedDataSource<TestNode>(),selected:false,search:""};
            env.perspectives.push(errorData);
            env.perspectives.push(duplicatedData);
            env.tests = envData.tests;
            env.main_log = envData.main_log;
            if (!this.errors_cfg){
                this.errors_cfg = {data:{},queues:{checked:[],removed:[],added:[]},headers:["Error","Scenario","Comment"],
                single_list:["Error"],multiple_list:["Scenario"]}; 
            }
            env.errors_cfg = {start_time:env.start_time,end_time:env.end_time};
            for (let key in this.errors_cfg){
              env.errors_cfg[key] = this.errors_cfg[key];
            }

            if (!this.duplicates_cfg){
              this.duplicates_cfg = {data:{},queues:{checked:[],removed:[],added:[]},headers:["Step","Scenario","Duplicate","Comment"],
              single_list:["Step"],multiple_list:["Scenario","Duplicate"]}; 
            }
            env.duplicates_cfg = {start_time:env.start_time,end_time:env.end_time};
            for (let key in this.duplicates_cfg){
              env.duplicates_cfg[key] = this.duplicates_cfg[key];
            }
            env.stacks ={};
            var error_nodes:TestNode[] = [];
            var duplicate_nodes:TestNode[] = [];
            var api_list:any = {}
            env.duplicate_steps = 0;
            var checked_errors =  env.errors_cfg.queues.checked;
            var checked_duplicates = env.duplicates_cfg.queues.checked;
            for (let scenario_name in env.tests){
                var scenario = env.tests[scenario_name];
                this.loadScenario(scenario,env);
                env.duplicate_steps += scenario.duplicate_steps; 
                if (scenario.error_summary && scenario.error_summary.length > 0){
                  for (let error of scenario.error_summary){
                    if (checked_errors.length > 0){
                      for (let rule of checked_errors){
                        var items = rule.Error.split("{}");
                        if (items.filter((item:string)=>error.name.indexOf(item)<0).length == 0){
                          if (rule.Scenario.indexOf(scenario.name) >= 0 || rule.Scenario.indexOf('All') >=0 ){
                            error.expected = true;
                            for (let step of error.steps ){
                              getErrorBadgeText(step);
                            }                            
                          }
                        }
                      }
                    }
                    if (!(error.name in this.errors_cfg.data)){
                      env.errors_cfg.data[error.name] = {}
                    }
                    error.scenario = scenario_name;
                    if (!(scenario_name in env.errors_cfg.data[error.name])){
                      env.errors_cfg.data[error.name][scenario_name]= [error];
                    }else{
                      env.errors_cfg.data[error.name][scenario_name].push(error);
                    }                    
                  }
                }               
                if (scenario.duplicated){
                  for (let api of scenario.duplicate_summary){                    
                    for (let step of api.steps){
                      if (!step.expected){
                        step.expected = {};    
                        step.disabled = {};                    
                      }

                      var step_name = step.name.trim().replace(step.name.split(" ",1)[0] + " ","");
                      step.expected[api.name] = false;
                      if (checked_duplicates.length > 0){
                        for (let rule of checked_duplicates){
                          var items = rule.Step.split("{}");
                          if (items.filter((item:string)=>step_name.indexOf(item)<0).length == 0){
                            if ((rule.Scenario.indexOf(scenario.name) >= 0 || rule.Scenario.indexOf('All') >=0) &&
                                (rule.Duplicate.indexOf(api.name) >= 0|| rule.Duplicate.indexOf('All') >=0 )){
                                  step.expected[api.name] = true;
                                  step.disabled[api.name] = true;
                                  getBadgeText(step);
                            }
                          }
                        }
                      }
                      if (!(env.duplicates_cfg.data[step_name])){
                        env.duplicates_cfg.data[step_name] = {};
                      }
  
                      if (!(env.duplicates_cfg.data[step_name][scenario.name])){
                        env.duplicates_cfg.data[step_name][scenario.name] = {};
                      }
  
                      
                      // if (step.name.indexOf('"') >= 0){                        
                      //   var items = step.name.split('"').filter((v: any,i: number)=>!(i%2))
                      //   step_name = items.join("{}");
                      // }                      
                      if (!env.duplicates_cfg.data[step_name][scenario.name][api.name]){
                        env.duplicates_cfg.data[step_name][scenario.name][api.name] = [step]                          
                      }else{
                        env.duplicates_cfg.data[step_name][scenario.name][api.name].push(step);
                      }
                      if (!(api.name in api_list)){
                        var api_node:TestNode = {name:api.name,children:[],data:{type:"duplicates",scenarios:{}}};
                        api_list[api.name] = api_node;
                        duplicate_nodes.push(api_node);
                      }
                      var api_data = api_list[api.name];
                      if (!(scenario.name in api_data.data.scenarios )){
                        var scenario_node:TestNode = {name:scenario.name,children:[],data:scenario};
                        scenario_node.data.type = "scenarios";
                        api_data.data.scenarios[scenario.name] = scenario;  
                        api_data.children.push(scenario_node);  
                        if (env.tests[scenario.name].infinite_calls){
                          scenario_node.data.infinite_calls = env.tests[scenario.name].infinite_calls;
                          for (let item of scenario_node.data.infinite_calls_list){
                            if (api.name == item.name){
                              api_data.data.infinite_calls = true;
                              if (this.infinity_calls.indexOf(env.name) < 0){
                                this.infinity_calls.push(env.name);                                
                              }                             
                              break; 
                            }
                          }
                        }
  
                      }
                    }                    
                  }   
                  
                }
            }
            env.error_num =0;        
            env.expected_errors = 0;
            env.expected_steps = 0;
            for (let log_name in envData.errors){
              var log_error_node:TestNode = {name:log_name,children:[],data:{type:"errors"}};
              error_nodes.push(log_error_node);
              var log_errors = envData.errors[log_name];
              var log_total = 0;
              this.dataService.getZip(this.configure.log_analysis_url + log_name + "/stacks.zip",log_name+"/stacks.json").then(
                (data)=>{
                  env.stacks[log_name] = data;
                }
                );
              for (let category in log_errors){
                var sub_total = 0;  
                if (category == 'fatal' && log_errors['fatal'].length > 0){
                  var fatal_node:TestNode={name:"fatal",children:[],data:{type:"errors"}};
                  log_error_node.children?.push(fatal_node);
                  for (var error of log_errors['fatal']){
                    var error_node:TestNode = {name:error.name,children:[],data:{type:"errors"}};
                    error_node.data = error;
                    error_node.data.log_file = log_name;
                    fatal_node.children?.push(error_node);
                    sub_total++;
                  }

                }
                else{
                  var category_node:TestNode ={name:category,children:[],data:{type:"errors"}};
                                
                  for (var error_type in log_errors[category]){
                    var error_type_node:TestNode = {name:error_type,children:[],data:{type:"errors"}};                    
                    var error_list = log_errors[category][error_type];
                    var scenario_dict:any = {};
                    var session_dict:any = {}
                    for (let error of error_list){
                        if (error.scenario){
                          if (error.scenario in scenario_dict){
                            scenario_dict[error.scenario].num += 1;
                          }else{
                            scenario_dict[error.scenario] = {num:1,error:error};
                          }                          
                        }else{
                          var error_name = error.thread;  
                          if (error.user){
                            error_name = error.user;
                          }                        
                          if (error.session){                                                        
                            if (!(error.session in session_dict)){
                              session_dict[error.session] = {name:error_name,num:0,data:error}                              
                            }                            
                            session_dict[error.session].num += 1;
                            error.type = "sessions"
                          }else{
                            error.type = "logs"
                            var error_node:TestNode = {name:error_name,children:[],data:{type:error.type}};
                            error_node.data = error;
                            error_node.data.log_file = log_name;                          
                            error_type_node.children?.push(error_node);    
                          }
                        }                        
                    }
                    for (let session_id in session_dict){
                      var error_node:TestNode = {name:session_dict[session_id].name,children:[],data:session_dict[session_id].data};
                      error_node.data.type="sessions";
                      error_node.data.log_file = log_name;
                      if (session_dict[session_id].num > 1){
                        error_node.name += " (" + session_dict[session_id].num +")";                                                
                      }
                      error_type_node.children?.push(error_node);  
                    }
                    for (let scenario in scenario_dict){
                      var error_node:TestNode = {name:scenario,children:[],data:{type:"scenarios",name:scenario}};

                      if (scenario_dict[scenario].num > 1){
                        error_node.name += " (" + scenario_dict[scenario].num + ")";
                      }
                      error_node.data.is_new = true;
                      if (scenario in env.scenarios){
                        error_node.data.is_new = false;
                      }
                      error_node.data.log_file = log_name
                      for (let error of env.tests[scenario].error_summary){
                        if (error.name == scenario_dict[scenario].error.name){
                          error_node.data.error = error
                        }
                      }
                      if (!error_node.data.error || !error_node.data.error.expected){
                        if (!error_node.data.error){
                          console.log(error_node);
                        }
                        
                        error_type_node.children?.push(error_node);  
                      }                      
                    }
                    error_type_node.name = error_type + "(" + error_list.length +")";
                    if (error_type_node.children?.length && error_type_node.children?.length > 0){
                      sub_total += error_list.length;
                      category_node.children?.push(error_type_node);
                    }
                  }
                  category_node.name = category_node.name + "(" + sub_total + ")";
                  if (category_node.children && category_node.children.length > 0){
                    log_error_node.children?.push(category_node);
                  }
                  
                }
                log_total += sub_total;
              }

              env.error_num  += log_total;
            }
            errorData.data.data = error_nodes;
            duplicatedData.data.data = duplicate_nodes;
            getExpectedError(env);
            getExpectedDupicates(env);
          }
        }
      }
      if (this.infinity_calls.length > 0){
        this.error_message = "Detected possible infinite calls in " + this.infinity_calls.join(",") + ", please select Duplicates in menu!"
      }
  }
  checkConfig(cfg:string){
    if (cfg == 'Error'){
      this.changeErrors = this.errors_cfg.queues.added.length + this.errors_cfg.queues.removed.length;
    }

    if (cfg == 'Duplicate'){
      this.changeDuplicates = this.duplicates_cfg.queues.added.length + this.duplicates_cfg.queues.removed.length;
    }

  }
  loadTasks(data:any){        
    if (data.build == this.build || location.origin.indexOf("local") > 0){
      this.updateJiras(data.jiras);
    }
    if (data.build <= this.build || location.origin.indexOf("local") > 0){
      this.task_build = data.task_build;
      var tasks = data.tasks;
      for (let envData of this.data){ 
        var version = envData.version.split(".").splice(0,2).join(".");       
        if (version in tasks){
          var task_nodes = [{name:"Unassigned task",children:[],data:{scenarios:[],removed:[],changes:[],jiras:[],scenario_list:[],type:"tasks"}}];
          var task_list = tasks[version];
          var scenarios:any = [];
          var sceranio_name_list = [];
          for (let task of task_list){
            for(let scenario in task.scenarios){
              
              if (scenario in envData.scenarios){
                var scenario_obj = task.scenarios[scenario]
                var scenario_data = envData.scenarios[scenario];
                scenario_data.data.comments = scenario_obj.comments;                
                if (scenario_obj.is_monitored){
                  if (scenario_obj.history){
                    scenario_data.data.history = scenario_obj.history;
                  }                  
                  scenario_data.data.is_monitored = true;
                  if (scenario_data.data.temp_comment){
                    scenario_data.data.temp_comment.is_monitored = true;
                  }
                }                
                scenario_data.data.assigned = task.owner;                
                scenarios.push(scenario_data)
                sceranio_name_list.push(scenario);
              }
            }          
          }          
          for (let scenario of scenarios){
            task_nodes = this.setTask(task_nodes,scenario);
          }
          for (let scenario in envData.scenarios){
            if(sceranio_name_list.indexOf(scenario) < 0){
              envData.scenarios[scenario].assigned = "Unassigned";
              task_nodes = this.setTask(task_nodes,envData.scenarios[scenario]);
            }
          }
          envData.perspectives[3].data.data = task_nodes;
        }
      }      
    }
    this.loadCfg(data);
  }
  loadCfg(data:any){
    if (data.errors_cfg){
      var index = 1;
      for (let item of data.errors_cfg){
        item.id = index;
        index++;
        this.errors_cfg.queues.checked.push(item);
      }       
    }
    if (data.duplicates_cfg){
      var index = 1;
      for (let item of data.duplicates_cfg){
        item.id = index;
        index++;
        this.duplicates_cfg.queues.checked.push(item);
      }       
    }

  }
  getVersion(envData:any) {
    if (envData.version){
      return envData.version.split(".").splice(0,2).join(".");
    }

  }
  updateTasks(tasks:any){
    this.conflict_changes = [];    
    for (let envData of this.data){  
      var version = this.getVersion(envData);
      if (version in tasks){
        var task_list = tasks[version];
        var tasks_data = envData.perspectives[3].data.data;
        envData.task_changes = []
        for (let task of task_list){
          for(let scenario in task.scenarios){
            if (scenario in envData.scenarios){
                var scenario_dict = task.scenarios[scenario];
                var scenario_data = envData.scenarios[scenario];
                if (scenario_data.data.assigned != task.owner){
                  var change:any = {};
                  change["src"] = scenario_data.data.owner;
                  change["dst"] = task.owner;
                  change.env = envData.name;
                  change.scenario = scenario_data.name;
                  envData.changes.push(change)
                  
                }
                scenario_data.data.assigned = task.owner;
                scenario_data.data.comments = scenario_dict.comments;
                scenario_data.data.is_monitored = scenario_dict.is_monitored;
                scenario_data.data.new_comment = {};
                tasks_data = this.setTask(tasks_data,scenario_data);
            }
          }
        }
        this.conflict_changes.push({name:envData.name,changes:envData.task_changes})        
      }
    }
    this.updateTaskChanges();
  }

  //update jiras only add 
  updateJiras(jiras:any){
    for (let envData of this.data){      
      var jira_nodes:TestNode[] = [];
      envData.jiras = jiras.filter((item:any)=>item.version.split(".").slice(0,2).join(".")<=envData.version)
      var jira_id_list:any= [];
      for (let a_jira of envData.jiras){
        jira_id_list.push(a_jira.id);
      }
      var jira_list = envData.perspectives[2].data.data;  
      var jira_ids:any = [];
      for (let jira of jiras){
        if (jira.version <= envData.version){            
            for (let case_data of jira_list){                            
              if(case_data.data.id == jira.id){ 
                jira_ids.push(jira.id);               
                var remove_list:any = [];
                var scenario_list:any = [];
                var jira_scenarios:any = [];
                for (let scenario of jira.scenarios){
                  jira_scenarios.push(scenario.name);
                }
                for (let scenario_data of case_data.data.scenarios){
                  if (jira_scenarios.indexOf(scenario_data.name) < 0){
                    var jira_index = scenario_data.data.jiras.indexOf(jira.id);
                    if (jira_index >=0){
                      scenario_data.data.jiras.splice(jira_index,1);
                      if (scenario_data.data.jiras.length == 0){
                        scenario_data.data.JIRA = null;
                      }
                      scenario_data.data.removed = scenario_data.data.removed.filter((case_id:string)=>case_id!=jira.id);
                      scenario_data.data.changed = scenario_data.data.changes.filter((case_id:string)=>case_id!=jira.id);
                    }                    
                    remove_list.push(scenario_data.name);
                  }else{
                    scenario_list.push(scenario_data.name);
                  }
                }                
                case_data.data.scenarios = case_data.data.scenarios.filter((item:any)=>remove_list.indexOf(item.name)<0);
                case_data.data.removed = case_data.data.removed.filter((item:string)=>remove_list.indexOf(item)<0);
                var change_list = jira.scenarios.filter((item:any)=>scenario_list.indexOf(item.name)<0)
                for (let scenario of change_list){
                  if (scenario.name in envData.scenarios){
                    case_data.data.scenarios.push(envData.scenarios[scenario.name]);
                    if (envData.scenarios[scenario.name].data.jiras.indexOf(jira.id) < 0){                      
                      envData.scenarios[scenario.name].data.jiras.push(jira.id);
                      envData.scenarios[scenario.name].data.JIRA = envData.scenarios[scenario.name].data.jiras.join(",");
                    }
                  }
                }
                case_data.data.changes = case_data.data.changes.filter((item:any)=>jira_scenarios.indexOf(item.name)<0);
                case_data.data.scenario_text = jira.scenario_text;
                jira_nodes.push(case_data);
              }else{
                for (let scenario_data of case_data.data.scenarios){
                  scenario_data.data.jiras = scenario_data.data.jiras.filter((item:string)=>jira_id_list.indexOf(item)>=0);
                  if (scenario_data.data.jiras.length + scenario_data.data.changes.length == 0){
                    scenario_data.data.JIRA = null
                  }else{
                    scenario_data.data.JIRA = scenario_data.data.jiras.join(",");
                  }
                  
                  // scenario_data.data.removed = scenario_data.data.removed.filter((item:string)=>item!=jira.id);
                  scenario_data.data.removed = [];
                }
                for (let scenario_data of case_data.data.changes){
                  // scenario_data.data.changes = scenario_data.data.changes.filter((item:string)=>item!=jira.id);
                  scenario_data.data.changes = [];
                }
              }
              
            }
            
        }
      }
      var removed_cases = jira_list.filter((item:any)=>jira_id_list.indexOf(item.data.id)<0)
      for (let removed_case of removed_cases){
        var index = jira_list.indexOf(removed_case);
        for (let scenario_data of removed_case.data.scenarios){
          scenario_data.data.jiras = scenario_data.data.jiras.filter((item:string)=>item!=removed_case.data.id);
          if (scenario_data.data.jiras.length + scenario_data.data.changes.length== 0){
            scenario_data.data.JIRA = null
          }else{
            scenario_data.data.JIRA = scenario_data.data.jiras.join(",");
          }          
        }
        if (index >=0){
          jira_list.splice(index,1);
        }
      }
      var new_jiras = jiras.filter((item:any)=>jira_ids.indexOf(item.id)<0 && item.version <= envData.version);
      for (let jira of new_jiras){
        var case_data:TestNode ={name:jira.id+":"+jira.summary,children:[],data:{
          id:jira.id,summary:jira.summary,scenarios:[],changes:[],checked:[],removed:[],existing:[],jiras:envData.jiras,type:"jira",
          scenario_text:jira.scenario_text,passed_tests:jira.passed_tests
        }};          
        for (let scenario of jira.scenarios){
          if (scenario.name in envData.scenarios){
            var scenario_data = envData.scenarios[scenario.name];
            case_data.data.scenarios.push(scenario_data);
            scenario_data.data.jiras.push(jira.id);
            scenario_data.data.JIRA = scenario_data.data.jiras.join(",");  
          }
        }
        jira_list.push(case_data);
      }
      envData.perspectives[2].data.data = jira_list;
    }
    this.updateJiraChanges();
    this.setJiraRefs();
    
  }

  setJiraRefs(){
    this.jira_refs = {};
    for (let envData of this.data){
      for(let case_data of envData.perspectives[2].data.data){
        if (!(case_data.data.id in this.jira_refs)){
          this.jira_refs[case_data.data.id] = [case_data.data]
        }else{
          this.jira_refs[case_data.data.id].push(case_data.data)
        }
        case_data.data.jira_ref = this.jira_refs[case_data.data.id]
      }
    }
  }
  getCheckedTests(test_data:any):any{
    var total_tests = 0;
    var checked_tests = 0;
    for(let test_node of test_data.children){      
      if(test_node.children.length == 0){        
        if (test_node.data){
          total_tests++;
          if (test_node.data.JIRA || test_node.data.changes.length){
            checked_tests++;
          }  
        }
      }else{
        var res = this.getCheckedTests(test_node);
        total_tests += res.total_tests;
        checked_tests +=  res.checked_tests;
      }
    }
    test_data.name = test_data.name.split("(")[0] + "(" + checked_tests +"/" + total_tests + ")";
    return {total_tests:total_tests,checked_tests:checked_tests}

  }
  resetCheckedTests(perspective:any){
    var length = perspective.data.data.length;
    var new_data: any[] = [];
    var changed = false;
    for (var i = 0; i < length; i ++){
      var test_data = perspective.data.data[i];
      if (test_data.name.indexOf("(") > 0){
        var previous = test_data.name;
        this.getCheckedTests(test_data);
        if (previous != test_data.name){
          changed = true;
        }
      }
      new_data.push(test_data);
    }
    if (changed){
      perspective.data.data = new_data;
    }

  }
  updateJiraChanges(){
    var changes = 0;
    var changedJiras = 0;
    for (let env of this.data){
      this.resetCheckedTests(env.perspectives[0]);
      this.resetCheckedTests(env.perspectives[1]);
      for (let case_data of env.perspectives[2].data.data){
        if (!case_data.data.set_pass && case_data.data.changes.length + case_data.data.removed.length > 0){

          changes += case_data.data.changes.length + case_data.data.removed.length;
          changedJiras ++;
        }        
      }
    }
    for (let ticket in this.jira_refs){
      if (this.jira_refs[ticket].length > 0 && this.jira_refs[ticket][0].set_pass){
        changes++;    
        changedJiras++;    
      }
    }
    this.jiraChanges = changes;
    this.changedJiras = changedJiras;

    console.log(this.jiraChanges);
  }
  
  submitChanges(){    
    this.is_processing = true;    
    if (location.origin.toLowerCase().indexOf("localhost") < 0){
      this.dataService.getData(this.job_url+"/lastBuild/api/json").subscribe((data)=>{
        if (data.number == this.build){
          this.last_build = true;
          this.submit = true;
          this.checkTaskVersion();
        }else{
          this.last_build = false;
          this.error_message = "The test result of the current workspace is out of date. Please submit the changes against the result of build " + data.number;
        }
      })  
    }else{
      this.updateChanges();
    }

  }

  addQueueItem(queues:any,changes:any){
    for (let row of queues.checked){
      var item:any = {};
      for (let key in row){
        if (key != 'target' && key != 'id'){
          item[key] = row[key];
        }
      }
      changes.push(item);
    }
    for (let row of queues.added){
      var item:any = {};
      for (let key in row){
        if (key != 'target' && key != 'id'){
          item[key] = row[key];
        }
      }
      changes.push(item);      
    }
  }

  updateChanges(){
    var changes:any={build:this.build,jiras:[]};
    
    changes.tasks = {};
    var task_queue = ['removed','scenarios','changes']
    for (let envData of this.data){
      for (let case_data of envData.perspectives[2].data.data){
        if (!case_data.data.set_pass && case_data.data.removed.length + case_data.data.changes.length > 0){
          var jira:any = {};
          var existing = false;
          jira.id = case_data.data.id;
          for (let ticket of changes.jiras){
            if (ticket.id == jira.id){
              jira = ticket;
              existing = true;
              break;
            }
          }
          if (existing){
            if (jira.version >= envData.summary["PORTAL VERSION"]){
              jira.version = envData.summary["PORTAL VERSION"];
              for (let scenario_data of case_data.data.scenarios){
                if (case_data.data.removed.indexOf(scenario_data.name) < 0 ){
                  jira.scenarios.push({name:scenario_data.name,url:scenario_data.data.scenario_url,feature:scenario_data.data.feature_file});
                }
              }
              for (let scenario_data of case_data.data.changes){
                jira.scenarios.push({name:scenario_data.name,url:scenario_data.data.scenario_url,feature:scenario_data.data.feature_file});
              }  
            }
          }else{
            jira.version = envData.summary["PORTAL VERSION"];
            if (case_data.data.is_new){
              jira.project = case_data.data.project;
              jira.team = case_data.data.team;
              jira.summary = case_data.data.summary;
              jira.description = case_data.data.description;
              jira.steps = case_data.data.steps;
              jira.is_new = true;
            }
            jira.scenarios = [];
            for (let scenario_data of case_data.data.scenarios){
              if (case_data.data.removed.indexOf(scenario_data.name) < 0 ){
                jira.scenarios.push({name:scenario_data.name,url:scenario_data.data.scenario_url,feature:scenario_data.data.feature_file});
              }
            }
            for (let scenario_data of case_data.data.changes){
              jira.scenarios.push({name:scenario_data.name,url:scenario_data.data.scenario_url,feature:scenario_data.data.feature_file});
            }
            changes.jiras.push(jira);
          }          
        }
        else{
          if (case_data.data.set_pass){
            var jira:any = {id:case_data.data.id,pass_test:true,version:envData.summary["PORTAL VERSION"]};
            var existing = false;
            for (let ticket of changes.jiras){
              if (ticket.id == jira.id){
                jira = ticket;
                existing = true;
                break;
              }
            }
            if (!existing){
              changes.jiras.push(jira);
            }                          
          }
        }
      }
      var version = this.getVersion(envData);
      if (!(version in changes.tasks)){
        changes.tasks[version] = []
      }
      
      for (let task_data of envData.perspectives[3].data.data){
        if (task_data.name != "Unassigned task"){
          var item:any = {scenarios:{}};
          var start_date = envData.start_time.split("T")[0];
          item["env"] = envData.name
          var remove_list = [];
          if (task_data.data.removed){
            for (let removed_item of task_data.data.removed){
              remove_list.push(removed_item.name);
            }
          }
          for (let key in task_data.data){
            if (task_queue.indexOf(key) < 0){
              item[key] = task_data.data[key];
            }else{
              for (let scenario of task_data.data.scenarios){
                if (remove_list.indexOf(scenario.name) < 0){
                  this.setTaskScenario(item.scenarios,scenario,false,start_date);
                }
              }
              for(let scenario of task_data.data.changes){
                item.changed = true;
                this.setTaskScenario(item.scenarios,scenario,true,start_date);
  
              }
            }  
          }
          changes.tasks[version].push(item);
        }        
      }
    }
    if (this.changeErrors > 0){
      changes.errors_cfg =[]
      this.addQueueItem(this.errors_cfg.queues,changes.errors_cfg);
    }
    if (this.changeDuplicates > 0){
      changes.duplicates_cfg =[]
      this.addQueueItem(this.duplicates_cfg.queues,changes.duplicates_cfg);
    }
    
      if (this.user){
        changes.user = this.user;
      }
      if (location.origin.toLowerCase().indexOf("localhost") < 0){
        var requestData = new URLSearchParams();
        requestData.append("blob",JSON.stringify(changes));
        this.update_changes = true;
        fetch(this.configure.task_job+"/buildWithParameters?",{
          method:"POST",
          headers:{
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Jenkins-Crumb': this.user.crumb
          },
          body:requestData
        }).then(response=>{setTimeout(this.checkTaskVersion.bind(this),10000);})
      }
      console.log(changes);  
  }
  set_pass_test(checked:boolean,node:any){
    if (node.data.jira_ref){
      for(let case_data of node.data.jira_ref){
        case_data.set_pass = checked;
      }
      if (checked){
        this.jiraChanges++;
      }else{
        this.jiraChanges--;
      }
    }
    this.updateJiraChanges();
  }
  setTaskScenario(scenarios:any,scenario:any,changed:boolean,test_date:string){
    if (!(scenario.name in scenarios)){
      scenarios[scenario.name] = {}      
      scenarios[scenario.name].is_monitored=scenario.data.is_monitored;
      scenarios[scenario.name].comments=scenario.data.comments;      
      scenarios[scenario.name].new_comment = scenario.data.new_comment;
      scenarios[scenario.name].failed_step = scenario.data.failed_step;
      scenarios[scenario.name].date = test_date;
      scenarios[scenario.name].url = scenario.data.scenario_url;
      scenarios[scenario.name].work_url = report_url + "#" + scenario.data.url.split("/")[1].split(".")[0];
      scenarios[scenario.name].changed = changed;
      scenarios[scenario.name].version = scenario.data.version;      
    }
  }


  checkTaskVersion(){    
    this.dataService.getData(this.configure.task_job+'/api/json').subscribe((data)=>{
      if(data.lastBuild.number > data.lastCompletedBuild.number){

        setTimeout(this.checkTaskVersion.bind(this),5000);
      }else{
        if(data.lastCompletedBuild.number > this.task_build){
          if (this.update_changes||this.jiraChanges+this.taskChanges==0){
            window.location.reload();
          }          
          this.dataService.getData(this.configure.task_job+'/tasks/tasks.json').subscribe((data)=>{
            this.updateJiras(data.jiras);
            this.updateTasks(data.tasks);
            this.task_build = data.task_build;             
            this.submitTasks();   
          })
        }else{
          this.submitTasks();
        }        
      }
    })
      
  }
  submitTasks(){
    if (this.submit){
      var totalChange = this.jiraChanges + this.taskChanges + this.changeErrors + this.changeDuplicates;
      if(totalChange > 0){
        var conflicts_number = 0;
        if (this.conflict_changes.length > 0){          
          for (let conflict_change of this.conflict_changes){
            conflicts_number += conflict_change.length;
          }
        }
        if (conflicts_number > 0){
          var dialogRef = this.dialog.open(DialogChangeDialog,{data:this.conflict_changes});
          dialogRef.afterClosed().subscribe((result)=>{
            if(result){
              this.updateChanges();
            }else{
              this.is_processing = false;
            }
          })      
        }else{
          this.updateChanges();
        }
      }
      this.submit = false;
    }
    // else{
    //   this.is_processing = false;    
    // }

  }
  enableSummary(workspace:string){
    if(workspace == 'Jiras' && this.jira){
      console.log(this.jira);
      this.jira.data.selected = false;
      this.jira=null;
    }
    if(workspace == "Errors"||workspace=="Duplicates"){
      this.clearNodes();
      this.data_type = "report";
      if (this.summaryPage){
        this.summaryPage.reset();        

      }      
      this.node = null;
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
    if (!jira.data.existing || jira.data.existing.length == 0){
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
    this.assignSelf();
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
        case_item.data.changes.push(this.frontend.node);
        if (case_item.data.jira_ref && case_item.data.jira_ref.length> 0){
          this.unsetJiraRef(case_item.data.jira_ref);
        }                
        this.frontend.node.data.changed = true;
      }
    }
    this.updateJiraChanges();
  }

  unsetJiraRef(jira_ref:any){
    for(let env_case_data of jira_ref){
      if (env_case_data.set_pass){
        env_case_data.set_pass = false;
      }
    }
  }

  setTimelineValue(){
    var value = this.data[this.selectIndex].timelines.value;
    var start_time = new Date(this.data[this.selectIndex].timelines.start_time+".000+00:00");
    start_time.setTime(start_time.getTime() + value * 1000);
    var current_time = start_time.toISOString().replace('T', ' ').replace('Z','');
    var timelines = this.data[this.selectIndex].timelines;
    var contexts:any = {}
    timelines.context_list=[];
    timelines.account_list=[];
    timelines.selected_accounts=[];
    for(let container of timelines.containers){
      container.visible = false;
      if(container.start_time <= current_time && container.end_time >= current_time){
        container.visible = true;
        for (let scenario of container.scenarios){
          if(scenario.start_time <= current_time && scenario.end_time >= current_time){
            container.scenario = scenario;
            for (let username in scenario.test_users){
              var test_user_data = scenario.test_users[username];
              if ( test_user_data instanceof Array){
                for (let item of test_user_data){
                  if (item.start_time <=current_time && item.end_time > current_time){
                    timelines.account_list.push(username)
                    scenario.test_user = username;
                    break;
                  }
                }
              }else{
                if (test_user_data.start_time <= current_time && test_user_data.end_time > current_time){
                  timelines.account_list.push(username);
                  scenario.test_user = username;
                }
              }
              // timelines.account_list.push(username);
            }            
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
    this.accountCtrl.setValue(null);
    this.data[this.selectIndex].timelines.current_time = current_time.split(".")[0];
    console.log(this.data[this.selectIndex].timelines);

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
    this.barChartData.labels = [];
    this.barChartData.datasets = [];
    this.headers = env_data.timelines.headers;      
    var color = 'black';
    var end_times = [];
    for (let item of env_data.timelines.containers){
      var start_time = new Date(item.start_time);
      this.barChartData.labels.push(item.name);
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
      fill: true,
      tension: 0,
      borderColor: color,
      backgroundColor: 'blue'
    }
    this.barChartData.datasets=[dataset]
    console.log(this.chart);      
    this.updateReportChart();
    this.datasources=env_data.timelines.containers;
    this.setTimelineValue();

  }
  isErrorsOrDuplicates(workspace:string){
    return ["Errors","Duplicates"].indexOf(workspace) >= 0;

  }
  setWorkspace(workspace:string){
    if (workspace != this.workspace){
      this.workspace = workspace;      
      if (this.isErrorsOrDuplicates(this.workspace)){
        this.data_type = "report";
        this.enableSummary(workspace);
        this.node = null;
        this.frontend = null;
      }      
    }
    
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
              if (scenario.data.url.indexOf(this.test_id + ".") > 0){                
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
    if (this.scenario){
      this.scenario.reset();
    }
    
    console.log(node);
    if (!node.data){
      this.data_type = "summary";
      this.frontend = {}
      this.frontend.name = node.name;
      return;
    }
    this.node = node;
    node.data.selected=true;
    var test_data = [];
    if (node.data.type && node.data.type == 'report'){
      this.data_type = 'report';      
      this.report_name = node.data.report_name + " - " + node.name;      
      this.barChartData.labels = [];
      this.barChartData.datasets = [];
      this.headers = [];
      for (let key in node.data.data[0]){
        this.headers.push(key);
      }
      var color = 'black';
      for (let item of node.data.data){
        this.barChartData.labels.push(item.build);
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
      this.barChartData.datasets=[dataset]
      console.log(this.chart);      
      this.updateReportChart();
      this.datasources=node.data.data;
    }else if(node.data.type && node.data.type == 'jira'){
      this.data_type = 'jira';
      this.new_jira = null;
      this.jira = node;
      console.log(this.jira);
    }else if(node.data.type && node.data.type == 'tasks'){
      this.showTask(node);
    }else if(node.data.type && node.data.type == 'scenarios'){
      this.setScenario(node);
    }else if(node.data.type && node.data.type == 'sessions'){
      this.setSession(node);
    }else if(node.data.type && node.data.type == 'logs'){
      this.setLogs(node);
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

  setWorker(session:any,worker:any){
    var unitType = worker["type"];
    if (session[unitType]){   
      for (let item of session[unitType]){
        if (item.id == worker.id){
          worker.msg = item.msg;
          console.log(worker);
        }
    }
}
  }

  openWorker(worker:any){
    if (!this.data[this.selectIndex].sessions){
      this.data[this.selectIndex].sessions = {};
    }
    if (!this.data[this.selectIndex].sessions[worker.log_file]){
      this.data[this.selectIndex].sessions[worker.log_file]={}
    }
    if (worker.session){
      if (!this.data[this.selectIndex].sessions[worker.log_file][worker.session]){
        this.dataService.getZip( this.configure.log_analysis_url + worker.log_file + "/" + worker.session + ".zip",worker.log_file + "/" + worker.session +"/session.json").then((data)=>{
          this.data[this.selectIndex].sessions[worker.log_file][worker.session] = data;
          this.setWorker(this.data[this.selectIndex].sessions[worker.log_file][worker.session],worker);
        });
        console.log(worker.data);
      }else{
        this.setWorker(this.data[this.selectIndex].sessions[worker.log_file][worker.session],worker);
      }  
    }
  }
  setLogs(log:any){
    this.data_type="log";
    if(!this.data[this.selectIndex].logs){
      this.data[this.selectIndex].logs = {};
    }
    if (!(log.data.log_file in this.data[this.selectIndex].logs)){
      this.data[this.selectIndex].logs[log.data.log_file] ={}      
    }
    var logs= this.data[this.selectIndex].logs[log.data.log_file]
    if (!logs[log.data.thread]){
      logs[log.data.thread] = {}
    }
    if (!logs[log.data.thread][log.data.unknown]){
      this.dataService.getZip(this.configure.log_analysis_url + log.data.log_file + "/unknown/" + log.data.thread +".zip", log.data.log_file + "/unknown/" + log.data.thread +"/"+log.data.unknown +".json").then((data)=>{
          logs[log.data.unknown] = data;
          this.frontend = data;             
          this.setStackList(this.frontend,log.data.log_file,this.data[this.selectIndex]);        
          }  
        );            
    }else{
      this.frontend = logs[log.data.thread][log.data.unknown];
      this.setStackList(this.frontend,log.data.log_file,this.data[this.selectIndex]);
    }
    console.log(this.frontend);
  }
  setSession(session:any){
    this.data_type="session";
    if (!this.data[this.selectIndex].sessions){
      this.data[this.selectIndex].sessions={}
    }
    if (!(session.data.log_file in this.data[this.selectIndex].sessions)){
      this.data[this.selectIndex].sessions[session.data.log_file] ={}
    }
    if (!this.data[this.selectIndex].sessions[session.data.log_file][session.data.session]){
      this.dataService.getZip( this.configure.log_analysis_url + session.data.log_file + "/" + session.data.session + ".zip",session.data.log_file + "/" + session.data.session +"/session.json").then((data)=>{        
        this.frontend = data;             
        if (this.frontend._contents){
          for (let content of this.frontend._contents){
            if (this.frontend[content]){
              for (let item of this.frontend[content]){
                if(item.error && item.error.level && item.error.level == 'ERROR'){
                  item.hasError = true;
                  this.setStackList(item,session.data.log_file,this.data[this.selectIndex]);
                }
              }    
            }
  
          }
        }else{
          if (this.frontend.worker){
            for (let item of this.frontend.worker){
              if(item.error && item.error.level && item.error.level == 'ERROR'){
                item.hasError = true;
                this.setStackList(item,session.data.log_file,this.data[this.selectIndex]);
              }
            }  
          }
          if (this.frontend.unknown){
            for (let item of this.frontend.unknown){
              if(item.error && item.error.level && item.error.level == 'ERROR'){
                item.hasError = true;
                this.setStackList(item,session.data.log_file,this.data[this.selectIndex]);
              }
            }  
          }
  
        }
        if (this.frontend.error && this.frontend.error.stacks){
            
          this.setStackList(this.frontend,session.data.log_file,this.data[this.selectIndex]);          
        }
        this.data[this.selectIndex].sessions[session.data.log_file][session.data.session] = this.frontend;
      });
    }else{
      this.frontend = this.data[this.selectIndex].sessions[session.data.log_file][session.data.session];

    }
    console.log(this.frontend);
  }
  setStackList(item:any,log_file:string,envData:any){
    if (item.error.stacks){
      item.stacks_list =[];
      for (let exception in item.error.stacks){
        var stack = item.error.stacks[exception];
        stack.exception = exception;
        if (item.log_file){
          log_file = item.log_file
        }
        stack.log_file = log_file;
        if (log_file in envData.stacks){
          stack.msg = envData.stacks[log_file][exception][stack.index];        
        }        
        item.stacks_list.push(stack);
      }
    }

  }

  loadScenario(scenario:any,envData:any){    
    scenario.error_summary = [];
    scenario.duplicate_summary = [];
    scenario.step_summary = {};
    scenario.duplicate_steps = 0;    
    if (scenario.steps){
      var step_id = 0;
      for (let step of scenario.steps){
        step_id++;
        step.id = "step_" + step_id;
        step.scenario =  scenario
        if (!scenario.step_summary[step.name]){
          scenario.step_summary[step.name] = [step.id];
        }else{
          scenario.step_summary[step.name].push(step.id);
        }
        var step_error:any = {name:step.name,errors:[]}
        if ((step.errors ||step.sessions) && step.duplicated){
          step.badgeText = "D,E";          
        }else{
          if (step.errors || step.sessions){
            step.badgeText = "E";
          }
          if (step.duplicated){
            step.badgeText = "D";
          }

        }
        if (step.duplicated){
          scenario.duplicate_steps++;
          for (let api of step.duplicated){
            this.setNameSteps(scenario.duplicate_summary,api,step);            
          }
        }
        var errors:any = {};
        if (step.errors){          
          for (let error of step.errors){
            this.setNameSteps(scenario.error_summary,error.name,step);                        
            
            if (step_error.errors.indexOf(error.name) < 0){
              step_error.errors.push(error.name);
            }            
            if (error.type){
              if (error[error.type]){
                errors[error.type + error[error.type]] = error;
              }else{
                if (error.api && error.worker){
                  errors["worker" + error.worker] = error;
                }
                
              }
              
            }              
          }
        }
        if (step.sessions){
          for (let session of step.sessions){
            this.setNameSteps(scenario.error_summary,session.error,step);
            session.badgeText = "E";
          }
        }
        if (step.workers){
          scenario.has_logs = true;
          step.worker_list  = [];
          for(let api in step.workers){
            if (step.workers[api].length > 1000){
              step.infinite_calls = true;
              scenario.infinite_calls = step;
              if (!scenario.infinite_calls_list){
                scenario.infinite_calls_list = [];
              }              
              scenario.infinite_calls_list.push({name:api,num:step.workers[api].length})  
            }
            for(let session_worker of step.workers[api]){
              var item:any = {name:api,id:session_worker.id,session:session_worker.session,log_file:envData.main_log,type:session_worker.type,start_time:session_worker.start_time}
              step.worker_list.push(item);
              if (step.duplicated && step.duplicated.indexOf(item.name) >=0 ){
                item.duplicated = true;
              }
              if (step.errors && (item.type + item.id) in errors){
                item.hasError = true;
                item.error = errors[item.type + item.id];
                this.setStackList(item,item.error.log_file,envData);
              }
              if (item.duplicated && item.hasError){
                item.badgeText = "D,E";
              }else{
                if (item.duplicated){
                  item.badgeText = 'D';
                }
                if (item.hasError){
                  item.badgeText = 'E';
                }
              }
            }          
          }
          step.worker_list.sort((a:any,b:any)=>a.start_time>b.start_time?1:-1);
          if (step.infinite_calls){
            step.logGroup = []
            step.cursor = 100;
            for (var i = 0; i < step.cursor; i++){
                step.logGroup.push(step.worker_list[i]);
            }
          }  
        }
        if (step.unknown){
          for (let unknown of step.unknown){
            unknown.name = unknown.thread;
            unknown.type = "unknown";
            if (unknown.error && unknown.error.stacks){
              this.setStackList(unknown,unknown.error.log_file,envData)
            }
          }
          step.unknown.sort((a:any,b:any)=>a.start_time>b.start_time?1:-1);
        }  
      }
    }

  }

  setNameSteps(name_list:any,name:string,step:any){    
    var target_steps= null;
    for(let name_steps of name_list){
      if (name_steps.name == name){
        target_steps = name_steps;
        break;
      }
    }
    if (!target_steps){
      target_steps = {name:name,steps:[]};
      name_list.push(target_steps);
    }
    var in_steps = false;
    for (var step_item of target_steps.steps){
      if (step_item.id == step.id){
        in_steps = true;
        break;
      }
    }
    if(!in_steps){
      target_steps.steps.push(step);
    }
    
  }

  setScenario(scenario:any){
    this.data_type="scenario";
    var scenario_name = scenario.data.name;
    if (scenario_name in this.data[this.selectIndex].tests){
      this.frontend = this.data[this.selectIndex].tests[scenario_name];
      if (scenario.data.error && scenario.data.error.name){
        this.frontend.error_text = scenario.data.error.name;
      }
      
    }    
    console.log(this.frontend);
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
            var select_node = search_res[search_res.length-1];
            if (search_res[search_res.length-1].children.length > 0){              
              this.treeControl.expand(select_node);
              document.getElementById(select_node.name.split('(')[0].replaceAll(' ','_'))?.scrollIntoView();
            }else{
              this.selectNode(search_res[search_res.length-1]);
            }            
            break;
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
    }
    if (node.name.indexOf(search) >=0){
      return [node]
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
        this.frontend.show_history = "History";
        if (node.data.owner){
          this.frontend.owner = this.owners[node.data.owner];          
        }
        if (node.data.error_ids){
          var env_name = this.data[this.selectIndex].name;          
          node.data.error_data = [];
          if (!node.data.error_table){
            for (let error_id of node.data.error_ids){
              var error_url = env_name + "_errors/" + error_id + ".json";
              this.dataService.getData(error_url).subscribe({next:(data)=>{
                node.data.error_data.push(data);
                if (data.scenario && !node.data.error_headers){
                  node.data.error_headers = ["time","step"]
                  node.data.error_table =[]
                  var steps = []
                  for (let context of data.scenario.contexts){
                    for(let step of context.steps){
                      steps.push(step)
                    }
                  }
                  for(let step of steps){
                    var item:any = {};
                    var values = step.split("|");
                    item.time = values[0]
                    item.step = values[1]
                    node.data.error_table.push(item)
                  }
                }
                node.data.error_headers.push(data.thread);
                var data_source = node.data.error_table;
                var current_step = 0
                for (let msg of data.msg){
                    var content = msg.split("[" + data.thread+"]")[1].trim()
                    var log_time:string
                    var log_content:string 
                    var log_items= content.split(" ",1)
                    log_time = log_items[0]
                    log_content = content.substr(log_time.length)
                    log_time = log_time.replace("T", " ")
                    
                    while(current_step < node.data.error_table.length - 1 && log_time > node.data.error_table[current_step + 1].time){
                      current_step++;
                    }
                                                            
                    if (!data_source[current_step][data.thread]){
                      data_source[current_step][data.thread] = []
                    }
                    data_source[current_step][data.thread].push(log_time  + " " + log_content)
                }
              }})
            }
          }

        }
        if (node.data.assigned){
          this.frontend.assigned = this.owners[node.data.assigned];
        }
        this.frontend.node = node;
        if (!this.frontend.node.data.temp_comment){
          this.frontend.node.data.temp_comment ={};
        }
        if (this.frontend.node.data.is_monitored){
          this.frontend.node.data.temp_comment.is_monitored = this.frontend.node.data.is_monitored;
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
            var containerName = "container" + parseInt(container_name.substr(9));
            this.frontend.screenshots_url = path_items[0] + "//" + path_items[1] + "/artifact/screenshots-" + containerName + ".tar.gz";
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
        var envData = this.data[this.selectIndex];
        if (envData.tests && node.name in envData.tests){
          this.frontend.test = envData.tests[node.name];
        }
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
    this.checkBuild();
    if (!this.frontend.is_managed){
      this.frontend.is_managed = true;
      this.frontend.show_management ="Hide Management";      
    }else{
      this.frontend.is_managed = false;
      this.frontend.show_management ="Management";
    }
  }
  historySwitch(){

    if (!this.frontend.showHistory){
      this.frontend.showHistory = true;
      this.frontend.show_history ="Hide History";      
    }else{
      this.frontend.showHistory = false;
      this.frontend.show_history ="History";
    }
  }

  addComment(assignTask:boolean){    
    if (!this.frontend.node.data.new_comment){
      this.frontend.node.data.new_comment = {"user":this.user}
    }    
    this.frontend.node.data.new_comment.is_monitored = this.frontend.node.data.temp_comment.is_monitored;
    this.frontend.node.data.new_comment.content = this.frontend.node.data.temp_comment.content;    
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    this.frontend.node.data.new_comment.datetime = localISOTime.replace("T", " ");
    if (!this.frontend.node.data.assigned||this.frontend.node.data.assigned=="Unassigned"){
      if(assignTask){
        this.assignSelf();
      }      
    }
    this.updateTaskChanges();    
  }
  removeComment(){
    if (this.frontend.node.data.new_comment){
      this.frontend.node.data.new_comment = null;
    }
    if (this.frontend.node.data.temp_comment){
      this.frontend.node.data.temp_comment = {};
      this.frontend.node.data.temp_comment.is_monitored = this.frontend.node.data.is_monitored;
    }
  }
  resetSummary(){    
    for (let envData of this.data){
      if (this.workspace == "Errors"){
        if (envData.errors_cfg.reset){
          envData.errors_cfg.reset();
        }
      }
      if (this.workspace == "Duplicates"){
        if (envData.errors_cfg.reset){
          envData.duplicates_cfg.reset();
        }         
      }
    }
  }
  changeEnv(_event:any){
    this.selectIndex = _event;
    if (this.data_type=="report" || this.data_type=="test"){
      this.setReportData();
    }else{      
      this.setWorkspace(this.workspace)        

    }  
    if(this.summaryPage){
      this.summaryPage.reset();
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
    this.barChartData={labels:[],datasets:[]};
    this.headers=[];
    for (let column in summary.data[0]){
      this.headers.push(column);
    }
    this.datasources = [];
    for (let item of summary.data){
      this.barChartData.labels?.push(item["Started on"])
      failed_data.push(item.failed);
      total_data.push(item.Scenarios-item.failed);
      this.datasources.push(item);
    }     
    this.datasources.sort((a:any,b:any)=>(a["Started on"] > b["Started on"]?-1:1));
    var dataset = {data:failed_data,
      label: 'Failed Tests',
      fill: false,
      tension: 0,
      borderColor: 'black',
      backgroundColor: 'red'
      }
    var totalset = {data:total_data,
      label:"Passed Tests",
      fill: false,
      tension: 0,
      borderColor: 'black',
      backgroundColor: 'green'

    }
    this.barChartData.datasets = [dataset,totalset];
    this.chart?.chart?.update();      
  }
  updateReportChart(){
    this.barChartOptions = {...this.barChartOptions};
  }
  clearNodes(){
    this.test_user_id = "";
    for (let env_data of this.data){
      for (let perspective of env_data.perspectives){
        for(let test of perspective.data.data){
          if (test.name.indexOf("Automation Test") >=0 || perspective.name == "Pages" ||perspective.name=="Errors"||perspective.name=="Duplicates"){
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
  removeTask(tasks:any,scenario_data:any){
    var owner_name = scenario_data.data.assigned;
    if (scenario_data.data.assigned.indexOf(" ")<0 && scenario_data.data.assigned in this.owners){
      owner_name = this.owners[scenario_data.data.assigned].user;
      scenario_data.data.assigned = this.owners[scenario_data.data.assigned].user;
    }

    owner_name += "'s task";    
    for (let task of tasks){
      if (!task.data.scenario_list){
        task.data.scenario_list = [];
        for (let scenario of task.data.scenarios){
          task.data.scenario_list.push(scenario.name);
        }
      }
      var index = task.data.scenario_list.indexOf(scenario_data.name);
      if (task.name == owner_name || index >= 0){        
        if (index >= 0){
          task.children.splice(index,1);
          task.data.scenario_list.splice(index,1);
          task.data.scenarios.splice(index,1);
        }                 
        task.data.removed = task.data.removed.filter((item:any)=>item.name!=scenario_data.name);
        task.data.changes = task.data.changes.filter((item:any)=>item.name!=scenario_data.name);
      }
    }
  }

  setTask(tasks:any,scenario_data:any){
    if (!scenario_data.data.assigned){
      scenario_data.data.assigned = "Unassigned";
    }
    var owner_name = scenario_data.data.assigned;
    if (scenario_data.data.assigned.indexOf(" ")<0 && scenario_data.data.assigned in this.owners){
      owner_name = this.owners[scenario_data.data.assigned].user;
      scenario_data.data.assigned = this.owners[scenario_data.data.assigned].user;
    }
    if (scenario_data.data.assigned == "Unassigned"){      
      owner_name = "Unassigned task";
    }else{
      owner_name +=  "'s task";
    }
    
    if (scenario_data.data.assigned){
      this.removeTask(tasks,scenario_data);
    }
    
    for (let task of tasks){
      task.data.type = "tasks"
      if (task.name == owner_name){        
        if (!task.data.scenario_list){
          task.data.scenario_list = [];
          for (let item of task.children){
            task.data.scenario_list.push(item.name);
          }        
        }      
        if (task.data.scenario_list.indexOf(scenario_data.name) < 0){
          task.children.push(scenario_data)
          task.data.scenarios.push(scenario_data)
          task.data.scenario_list.push(scenario_data.name)
          if (scenario_data.data.jiras){
            for(let jira of scenario_data.data.jiras){
              if (task.data.jiras.indexOf(jira) < 0){
                task.data.jiras.push(jira);
              }
            }
          } 
          var new_task:TestNode ={name:task.name,children:task.children,data:task.data};
          tasks = tasks.map((t:TestNode)=>t.name !== task.name? t:new_task) 
        }
        return tasks;
      }
    }

    var owner:TestNode = {name:owner_name,children:[scenario_data],data:{scenarios:[scenario_data],removed:[],changes:[],jiras:[],scenario_list:[scenario_data.name],type:"tasks"}};
    owner.data.owner = scenario_data.data.assigned;
    if (scenario_data.data.jiras){
      for (let jira of scenario_data.data.jiras){
        if (owner.data.jiras.indexOf(jira) < 0){
          owner.data.jiras.push(jira);
        }        
      }      
    }
    //tasks.push(owner);
    if (owner_name == "Unassigned task"){
      tasks.push(owner);
    }else{
      tasks.splice(tasks.length - 1,0,owner);
    }
    
    return tasks;

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
      item.scenario_url = scenario.data.scenario_url;
      item.jiras = scenario.data.jiras;
      item.new_comment = scenario.data.new_comment;
      item.comments = scenario.data.comments;
      item.status = "Unassigned";
      if (item.owner && item.owner != "Unassigned"){
        item.status = "Assigned";
      }

      if (item.jiras&&item.jiras.length > 0){
        item.status = "checked";
      }
      if (scenario.data.is_monitored){
        item.status = "monitored";
      }
      for (let removed_item of node.data.removed){
        if (removed_item.name == scenario.name){
          item.status = "removed";
          break;
        }
      }
      if (item.status != "removed"){
        this.task.scenario_list.push(item);
      }
      
    }
    for (let scenario of node.data.changes){
      var item:any = {};
      item.name = scenario.name;
      item.url = scenario.data.data.url;
      item.jiras = scenario.data.jiras;
      item.new_comment = scenario.data.new_comment;
      item.comments = scenario.data.comments;
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
      if (scenario.data.is_monitored){
        item.status = "monitored";
      }
      item.updated = true;
      this.task.scenario_list.push(item);
      console.log(this.task);
      console.log(node);
    }
  }
  assignSelf(){
    if (this.user && this.user.email in this.users){      
      this.assignTask(this.users[this.user.email].user);
    }else{
      this.assignTask("Unassigned");
    }
    this.updateTaskChanges();
  }

  updateTaskChanges(){
    var changes = 0;    
    for (let env of this.data){
      for (let task_data of env.perspectives[3].data.data){
        var task_changes = 0
        if (task_data.name != "Unassigned task"){          
          if (task_data.data.changes.length + task_data.data.removed.length > 0){
            task_changes += task_data.data.changes.length + task_data.data.removed.length;          
          }        
          for (let scenario of task_data.children){
            if (task_data.data.scenario_list.indexOf(scenario.name) >=0 && scenario.data.new_comment && scenario.data.new_comment.user){
              task_changes++
            }
          }  
          task_data.data.task_changes = task_changes;
          changes += task_changes;  
        }
      }
    }
    this.taskChanges = changes;    
    console.log(this.taskChanges);

  }

  getShortName(name:string){
    if (name){
      var short_name:string = "";
      for (let item of name.split(" ")){
        short_name += item[0];
      }
      return short_name.toUpperCase();  
    }
    return "";
  }

  assignTask(owner:any){
    console.log(owner);
    var task_name = owner + "'s task";
    if (owner == "Unassigned"){
      task_name = "Unassigned task"
    }

    
    var tasks = this.data[this.selectIndex].perspectives[3].data.data;
    var scenario_data = this.frontend.node;
    var srcTask,dstTask;
    var src_task_name;
    if (scenario_data.data.assigned){
      src_task_name = scenario_data.data.assigned + "'s task";
    }
    if (scenario_data.data.assigned && scenario_data.data.assigned == owner){
      return
    }
    scenario_data.data.assigned = owner;
    this.frontend.assigned = owner;
    this.taskChanges = 0;
    for (let task of tasks){
      if (task.name == task_name){
        task.children.push(scenario_data)              
        dstTask = task;
        var index = dstTask.data.scenario_list.indexOf(scenario_data.name);
        if (index >= 0){
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
      // this.taskChanges += task.data.removed.length + task.data.changes.length;
    }    
    if (srcTask){
      var task:TestNode = {name:srcTask.name,children:srcTask.children,data:srcTask.data}
      tasks = tasks.map((t:TestNode)=>t.name !== task.name? t:task)
    }
    if (!dstTask){
      var task:TestNode = {name:task_name,children:[scenario_data],data:{scenarios:[],changes:[scenario_data],removed:[],jiras:[],scenario_list:[]}}
      task.data.owner = owner;
      // this.taskChanges++;
      tasks.splice(tasks.length-1,0,task);
      // tasks.push(task);
    }else{
      var task:TestNode = {name:dstTask.name,children:dstTask.children,data:dstTask.data}
      tasks = tasks.map((t:TestNode)=>t.name !== task.name? t:task)
    }
    this.data[this.selectIndex].perspectives[3].data.data = tasks ;
    if (this.frontend.node.data.temp_comment.content && this.frontend.node.data.temp_comment.content.trim().length > 0){
      this.addComment(false);
    }    
    this.updateTaskChanges();
    return;
  }

  //remove jira from task
  removeJiraTask(scenario_data:any,task:any){
    var task_scenario_list:any[] = [];
    for (let scenario of task.data.scenarios){
      task_scenario_list.push(scenario.name);
    }
    for (let scenario of task.data.changes){
      task_scenario_list.push(scenario.name);
    }
    var task_removed_list:any = [];
    for (let scenario of task.data.removed){
      task_removed_list.push(scenario.name);
    }

    task_scenario_list = task_scenario_list.filter((item:any)=>task_removed_list.indexOf(item.name) < 0)

    if (scenario_data.data.jiras){
      var removed_jiras:any[] = []
      for(let jira of scenario_data.data.jiras){
        var case_data:any = null;
        for(let ticket of this.data[this.selectIndex].perspectives[2].data.data){
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
          var removed_list:any = [];
          for (let scenario of case_data.data.removed){
            removed_list.push(scenario.name);
          }
          scenario_list = scenario_list.filter((item:any)=>removed_list.indexOf(item.name) < 0)
          scenario_list = scenario_list.filter((item:any)=>(item.name in task_scenario_list))
          if(scenario_list.length == 0){
            removed_jiras.push(case_data.name)
          }
        }
      }
      if (removed_jiras.length > 0){
        task.data.jiras = task.data.jiras.filter((item:any) => (removed_jiras.indexOf(item) >= 0));
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
        // this.jira_refs[jira.id] = [];
      }
      if (!this.jira_refs[jira.id]){
        this.jira_refs[jira.id] = [];
      }
      var version = this.data[this.selectIndex].version;
      var envData = this.data[this.selectIndex];
      // for (let envData of this.data){
        if (envData.version <= version){
          envData.jiras.push(jira);
          var case_data:TestNode ={name:jira.id+":"+jira.summary,children:[],data:{
            id:jira.id,summary:jira.summary,scenarios:[],changes:[],checked:[],removed:[],existing:[],jiras:this.data[this.selectIndex].jiras,type:"jira",
            scenario_text:jira.scenario_text,passed_tests:jira.passed_tests,is_added:true,is_new:jira.is_new,index:this.data[this.selectIndex].jiras.length -1
            }
          };          
          if (jira.is_new){
            case_data.data.description = jira.description;
            case_data.data.team = jira.team;
            case_data.data.steps = jira.steps;
            case_data.data.project = jira.project
            case_data.data.jira_ref = this.jira_refs[jira.id];
          }
          var case_datas = this.data[this.selectIndex].perspectives[2].data.data;
          case_datas.unshift(case_data);
          this.jira_refs[jira.id].push(case_data.data);
          envData.perspectives[2].data.data = case_datas;
          if (this.data[this.selectIndex].name == envData.name){
            this.jira = case_data;
            if(jira.scenario){
              this.assignNode(this.data[this.selectIndex].jiras[case_data.data.index]);
              this.data_type="test";
            }      
          }
        }        
      // }
      this.new_jira=null;      
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
  removeAccount(account: string): void {
    var selected_accounts = this.data[this.selectIndex].timelines.selected_accounts;
    const index = selected_accounts.indexOf(account);

    if (index >= 0) {
      selected_accounts.splice(index, 1);      
    }
    for (let context of this.data[this.selectIndex].timelines.context_list){
      var c_checked = true;
      var some = false;
      for (let container of context.containers){
        if (account in container.scenario.test_users){
          var checked = false;
          for (let selected_account of selected_accounts){
            if (selected_account in container.scenario.test_users){
              checked = true;
            }  
          }
          container.checked = checked;          
        }  
        if(!container.checked){
          c_checked = false;
        }else{
          some = true;
        }
      }
      context.checked = c_checked;
      context.some = some;
    }
    this.containerDetail(this.data[this.selectIndex].timelines);
  }
  selectAccount(event: MatAutocompleteSelectedEvent): void {
    var account = event.option.viewValue;
    this.data[this.selectIndex].timelines.selected_accounts.push(account);
    for (let context of this.data[this.selectIndex].timelines.context_list){
      var checked = true;
      var some = context.some;
      for (let container of context.containers){        
        if (account in container.scenario.test_users){
          container.checked = true;
        }
        if (!container.checked){
          checked = false;
        }else{
          some = true;
        }          
      }
      if (checked){
        context.checked = true;
      }else{
        context.some = some;
      }
    }
    this.containerDetail(this.data[this.selectIndex].timelines);
    this.accountInput.nativeElement.value = '';
    this.accountCtrl.setValue(null);
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
        if (this.new_jira && this.new_jira.id){
          var items = this.new_jira.id.split("-");
          if (items.length != 2){
            this.new_jira.error = "Jira ID format is invalid!";
            return false; 
          }
          if (this.configure.projects.indexOf(items[0].toUpperCase()) < 0){
            this.new_jira.error = "Jira project must be one of projects : "  + this.configure.projects.join(",") +"!";
            return false;          
          }
          if (!/^\d+$/.test(items[1])){
            this.new_jira.error = "Jira id must be a number!";
            return false;          
          }
          this.new_jira.error="";
          if(this.new_jira.id && this.new_jira.summary && this.new_jira.id?.length >0 && this.new_jira.summary?.length > 0){
            return true;
          }    
        }       
      }      
    }
    return false;
  }
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.data[this.selectIndex].timelines.account_list.filter((account: string) => account.toLowerCase().includes(filterValue));
  }
}
