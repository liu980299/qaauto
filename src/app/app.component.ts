import { ApplicationInitStatus, APP_INITIALIZER, Component, Inject, OnInit,ViewChild  } from '@angular/core';
import { DataService } from './data.component';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
declare var report_url: any;
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
  is_report = false;
  initialized = false;
  summarys : any;
  public lineChartLegend = true;
  selectIndex = 0;
  report_name = "";
  headers:string[] = [];
  datasources:any;
  constructor(private dataService: DataService
    ){}
  ngOnInit(){
    this.dataService.getJSON().subscribe(data=>{
      this.data = [];
      this.summarys = [];
      for(let key in data){
        var env_data = {name:data[key].Env,data:new MatTreeNestedDataSource<TestNode>(),selected:false};
        var tests:TestNode[] = [];
        var auto_tests = 0
        var jobs:TestNode[] = [];        
        var auto_node:TestNode = {name:"Automation Test",children:[]}
        for(let job in data[key].jobs){
          var job_item = data[key].jobs[job];
          var job_data:TestNode = {name:job,children:[]};
          var job_length = 0;
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
              var feature_item = data[key].jobs[job][feature];
              var feature_data:TestNode = {name:feature,children:[]}
                for(let scenario in feature_item.scenarios){
                  var scenario_data:TestNode = {name:scenario,data:feature_item.scenarios[scenario],children:[]};
                  if (feature_data.children){
                    feature_data.children.push(scenario_data);
                  }              
                }             
              var feature_length = feature_data.children? feature_data.children.length:0;
              job_length = job_length + feature_length;
              if (feature_length > 0){
                feature_data.name = feature_data.name + "(" + feature_length +")";
              }              
              if (job_data.children){
                job_data.children.push(feature_data);
              }            
            }
            if (job_length > 0){
              job_data.name = job_data.name + "(" + job_length + ")"
              auto_tests += job_length;
            }          
            jobs.push(job_data)  
          }                    
        } 
        auto_node.children = jobs;
        if (auto_tests){
          auto_node.name += "(" + auto_tests + ")"
        }
        tests.push(auto_node);
        env_data.data.data = tests;         
        this.data.push(env_data); 
        var summary_data = {name:data[key].Env,data:data[key].summary};
        summary_data.data.sort((a:any,b:any)=>(a["Started on"] > b["Started on"])?1:((b["Started on"] > a["Started on"])?-1:0))
        this.summarys.push(summary_data);
      }
      this.data.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));  
      this.summarys.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));
      this.initialized = true;      
      document.getElementById("loading_mask")!.style.display = "none";  
      this.setReportData();    
     });
    
  }
  hasChild = (_: number, node: TestNode) => !!node.children && node.children.length > 0;
  title = 'qa_auto';
  selectNode(node:any){
    this.clearNodes();
    console.log(node);
    node.data.selected=true;
    var test_data = [];
    if (node.data.type && node.data.type == 'report'){
      this.is_report =true;
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
      this.chart?.chart?.update();
      this.datasources=node.data.data;
    }else{
      this.dataService.getData(node.data.url).subscribe({next:(data)=>{
        node.data.data=data;
        this.setData(node)
      },error: ()=>{window.location.reload()}
      }
      );

    }
  }
  setData(node:any){
    if (node.data.selected){
        this.is_report = false;
        this.frontend= node.data.data;
        if (this.frontend.img.indexOf(report_url) < 0){
          this.frontend.img = report_url + this.frontend.img;
        }
        //   this.frontend.img = "./assets/" + this.frontend.img;
        // }
        this.frontend.name = node.name;
        this.backend = [];
        for (let server in node.data.data.logs){
          this.backend.push({name:server,logs:node.data.data.logs[server]})
        };
        console.log(this.frontend);  
  
    }

  }
  changeEnv(_event:any){
    this.selectIndex = _event;
    this.setReportData();
    
  }
  setReportData(){
    this.is_report =true;
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
  }
  clearNodes(){
    for (let env_data of this.data){
      for(let test of env_data.data.data){
        if (test.name.indexOf("Automation Test") >=0 ){
            for(let job of test.children){
              for(let feature of job.children){
                for(let scenario of feature.children){
                  scenario.data.selected=false;
                }
              }      
            }
        }else{
          for (let scenario of test.children){
            scenario.data.selected=false;
          }
        }
      }
    }
  }
}
