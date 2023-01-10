import { Component, OnInit } from '@angular/core';
import { DataService } from './data.component';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
declare var report_url: any;
interface TestNode {
  name: string;
  children?: TestNode[];
  data?:any;
}


const TREE_DATA: TestNode[] = [
  {
    name: 'Fruit',
    children: [{name: 'Apple'}, {name: 'Banana'}, {name: 'Fruit loops'}],
  },
  {
    name: 'Vegetables',
    children: [
      {
        name: 'Green',
        children: [{name: 'Broccoli'}, {name: 'Brussels sprouts'}],
      },
      {
        name: 'Orange',
        children: [{name: 'Pumpkins'}, {name: 'Carrots'}],
      },
    ],
  },
];


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  data:any;
  treeControl = new NestedTreeControl<TestNode>(node => node.children);
  frontend:any;
  backend:any;
  constructor(private dataService: DataService){}
  ngOnInit(){
    this.dataService.getJSON().subscribe(data=>{
      this.data = []
      for(let key in data){
        var env_data = {name:data[key].Env,data:new MatTreeNestedDataSource<TestNode>()};
        var jobs:TestNode[] = [];
        for(let job in data[key].jobs){
          var job_data:TestNode = {name:job,children:[]};
          for (let feature in data[key].jobs[job]){
            var feature_data:TestNode = {name:feature,children:[]}
            for(let scenario in data[key].jobs[job][feature].scenarios){
              var scenario_data:TestNode = {name:scenario,data:data[key].jobs[job][feature].scenarios[scenario],children:[]};
              if (feature_data.children){
                feature_data.children.push(scenario_data);
              }              
            }
            if (job_data.children){
              job_data.children.push(feature_data);
            }            
          }          
          jobs.push(job_data)
          env_data.data.data = jobs;             

        }        
        this.data.push(env_data); 
        this.data.sort((a:any,b:any)=>(a.name > b.name)?1:((b.name > a.name)?-1:0));
        console.log(env_data);
      }
     });
  }
  hasChild = (_: number, node: TestNode) => !!node.children && node.children.length > 0;
  title = 'qa_auto';
  selectNode(node:any){
    this.clearNodes();
    console.log(node);
    node.data.selected=true;
    this.frontend= node.data;
    if (this.frontend.img.indexOf(report_url) < 0){
      this.frontend.img = report_url + this.frontend.img;
    }
    //   this.frontend.img = "./assets/" + this.frontend.img;
    // }
    this.frontend.name = node.name;
    this.backend = [];
    for (let server in node.data.logs){
      this.backend.push({name:server,logs:node.data.logs[server]})
    };
    console.log(this.frontend);
  }
  clearNodes(){
    for (let env_data of this.data){
      for(let job of env_data.data.data){
        for(let feature of job.children){
          for(let scenario of feature.children){
            scenario.data.selected=false;
          }
        }
      }
    }
  }
}
