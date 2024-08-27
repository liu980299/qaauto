import {Component,Input} from '@angular/core';
import { DataService } from './data.component';

@Component({    
    selector:'log-group',
    templateUrl:'group.component.html',

})
export class LogGroupComponent{
    @Input() envData:any;
    @Input() logGroup:any;
    @Input() configure:any;    
    constructor(private dataService:DataService){
        this.dataService = dataService;
    }
    openItem(worker:any){
        if (!this.envData.sessions){
          this.envData.sessions = {};
        }
        if (!this.envData.sessions[worker.log_file]){
          this.envData.sessions[worker.log_file]={}
        }
        if (worker.session){
          if (!this.envData.sessions[worker.log_file][worker.session]){
            this.dataService.getZip( this.configure.log_analysis_url + worker.log_file + "/" + worker.session +".zip", worker.log_file + "/" + worker.session +"/session.json").then((data)=>{
              this.envData.sessions[worker.log_file][worker.session] = data;
              this.setItem(this.envData.sessions[worker.log_file][worker.session],worker);
            });
            
            console.log(worker.data);
          }else{
            this.setItem(this.envData.sessions[worker.log_file][worker.session],worker);
          }  
        }
      }
      setItem(session:any,worker:any){
        var unitType = worker["type"];
        if (worker["type"]== "session"){
            worker.msg = session.msg;            
        }else{
            if (session[unitType]){               
                for (let item of session[unitType]){
                    if (item.id == worker.id){
                        worker.msg = item.msg;
                        console.log(worker);
                    }
                }
            }    
        }
        if (worker.stacks){
            worker.stacks_list = [];
            for (let exception in worker.stacks){
                var stack = worker.stacks[exception];
                stack.exception = exception;
                stack.log_file = worker.log_file;
                worker.stacks_list.push(stack);
              }        
        }
    }
      getBadgeText(item:any){        
        if (!item.name){
          item.name = item.thread;
        }
        if (!item.badgeText){
            if (item.duplicated && item.error && item.error.level){
                item.badgeText = "D,E";
              }else{
                if (item.duplicated){
                  item.badgeText = 'D';
                }
                if (item.error && item.error.level){
                  item.badgeText = 'E';
                }
            }           
        }
        return item.badgeText
      }
    
}