import {Component,EventEmitter,Input, OnInit, Output} from '@angular/core';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { Observable, map, startWith } from 'rxjs';
import { ConfigDialog } from './rule.component';
import { getBadgeText,getErrorBadgeText,getExpectedDupicates,getExpectedError, getNewId } from './scenario.component';
declare var jira_url:any;

@Component({    
    selector:'summary',
    templateUrl:'summary.component.html'    
})
export class SummaryComponent implements OnInit{
    @Input() data:any;
    @Input() envData:any;
    @Input() envs:any;    
    @Output() configChange = new EventEmitter<any>()
    target : string;    
    single_list = [];    
    headers : any;
    jira_url:any;
    multiple_list = ["Scenario","Step"];
    filteredErrors: Observable<string[]>;
    new_item:any = {};
    total = 0;
    source:any = {};
    level_updated = false;
    expected_num =  0;
    isSaveEnabled:boolean = false;    
    candidates:any = {};
    constructor(public dialog:MatDialog){
    }
    ngOnInit(): void {
        console.log(this.data);
        if(this.data){
            this.data.tests=this.envData.tests;   
            this.data.envs = this.envs;      
            this.data.jiras = this.envData.jiras;   
            this.jira_url = jira_url;
            this.target = this.data.headers[0];    
            this.headers = this.data.headers;            
            this.single_list = this.data.headers.filter((item:any)=>this.data.multiple_list.indexOf(item)<0&&item!='Jira');
            this.candidates[this.target] = [];
            for (let target in this.data.data){
                this.candidates[this.target].push(target);
            }                        
            this.data.categories = {};
            this.data.names = {};
            for (let rule of this.envData.errors_cfg.queues.checked){
                var ruleName = rule.Name.trim()
                if (!(rule.Category in this.data.categories)){
                    this.data.categories[rule.Category] = {};;
                }                
                if (!(ruleName in this.data.categories[rule.Category])){
                    this.data.categories[rule.Category][ruleName] = rule.Level;       
                }
            }
            for (let rule of this.envData.errors_cfg.queues.added){
                var ruleName = rule.Name.trim()
                if (!(rule.Category in this.data.categories)){
                    this.data.categories[rule.Category] = {};
                    this.data.categories[rule.Category][ruleName] = rule.Level;
                }                
                if (!(ruleName in this.data.categories[rule.Category])){
                    this.data.categories[rule.Category][ruleName] = rule.Level;       
                }
            }
            this.reset();
        }
        this.resetQueue();
        console.log(this);        
    }

    getChecked(){
        return this.data.queues.checked.filter((item:any)=>!item.updated);
    }

    keys(obj:any){
        return Object.keys(obj);
    }

    addRemoved(row: any) {
        var index = -1;
        var checked = [];
        for (var i=0;i<this.envData.errors_cfg.queues.checked.length;i++){
            if(this.envData.errors_cfg.queues.checked[i].id == row.id){
                index = i;                
            }else{
                checked.push(this.envData.errors_cfg.queues.checked[i]);
            }

        }
        if(index >=0){
            var removed = [];            
            for (let item of this.envData.errors_cfg.queues.removed){
                removed.push(item);
            }
            removed.push(row);
            this.envData.errors_cfg.queues.removed = removed;            
            this.envData.errors_cfg.queues.checked = checked;            
            var change:any ={};
            if (this.target == 'Error'){
                change.type = "Error";
                change.data = [{operation:"remove",rule:row}]
                
            }else{
                change.type = 'Duplicate';            
            }   
            this.configChange.emit(change);             
        }
        this.resetQueue();
    }
    editItem(element:any){
        this.data.current_id = element.id;
        this.data.updated = null;
        this.data.title  = "Edit Rule";
        var dialogRef = this.dialog.open(ConfigDialog,{data:this.data,width:"800px"});
        dialogRef.afterClosed().subscribe(this.updateResult.bind(this));

    }
    updateItem(element:any){
        this.data.current_id = null;
        this.data.updated = element;
        this.data.title  = "Edit Rule";
        var dialogRef = this.dialog.open(ConfigDialog,{data:this.data,width:"800px"});
        dialogRef.afterClosed().subscribe(this.updateResult.bind(this));

    }

    setCategory(event: MatSelectChange) {        
        if (event.value){
            this.source.category = event.value;
            this.source.name = null;
        }else{
            this.data.category = null;
        }
        
    }

    removeRemoved(row:any){
        var index = -1;
        var removed = [];        
        for (var i=0;i<this.envData.errors_cfg.queues.removed.length;i++){
            if(this.envData.errors_cfg.queues.removed[i].id == row.id){
                index = i;                
            }else{
                removed.push(this.envData.errors_cfg.queues.removed[i]);
            }

        }
        if(index >=0){
            var checked = [];            
            for (let item of this.envData.errors_cfg.queues.checked){
                checked.push(item);
            }
            checked.push(row);
            this.envData.errors_cfg.queues.removed = removed;
            this.envData.errors_cfg.queues.checked = checked;
            var change:any ={};
            change.type = "Error";
            change.data = [{operation:"new",rule:row}]
            this.configChange.emit(change);
            this.resetQueue();
        }
        
    }
    removeAdded(element: any) {
        var added = [];
        var origin_rule = null;
        for (var item of this.envData.errors_cfg.queues.added){
            if (item.id != element.id){
                added.push(item);
            }else{
                if (item.original_id){
                    for (let rule of this.envData.errors_cfg.queues.checked){
                        if (rule.id == item.original_id){
                            origin_rule = rule;
                            origin_rule.updated = false;
                            break;
                        }
                    }
                }
                
                for(let targets of item.target){
                    if (!(targets instanceof Array)){
                        console.log(targets);                        
                        targets.expected = false;   
                        for(let step of targets.steps){
                            getErrorBadgeText(step);
                        }                                                                                                   
                    }else{
                        if (this.target == "Error"){                        
                            for (let target of targets){
                                target.expected = false;   
                                for(let step of target.steps){
                                    getErrorBadgeText(step);
                                }                            
                            }                                                
                        }else{
                            for (let duplicate of element.Duplicate){
                                for (let target of item.target){
                                    if (duplicate in target.expected){
                                        target.expected[duplicate] = false;                                    
                                        getBadgeText(target);
                                    }
                                }
                                
                            }
                        }                        
                    }
                }                                    
            }            
            if(this.target == 'Error'){
                for (let env of this.envs){
                    getExpectedError(env);
                }                
            }else{
                for (let env of this.envs){
                    getExpectedDupicates(env);
                }                

            }
        }
        this.envData.errors_cfg.queues.added = added;
        var change:any = {};
        if (this.target == 'Error'){    
            change.type = "Error";        
            if (origin_rule &&origin_rule.Error == element.Error && origin_rule.Level == element.Level && origin_rule.Category == element.Category && origin_rule.Name == element.Name){                        
                change.data.push({operation:"update", rule: element})
            }else{
                change.data = [{operation:"remove", rule: element}]
                if (origin_rule){
                    change.data.push({operation:"new", rule: origin_rule})
                }
            }            
            this.configChange.emit(change);            
        }else{
            this.configChange.emit('Duplicate');            
        }

        this.resetQueue();
        
    }
    updateResult(result:any){
        if(result){
            console.log(result);
          }
          if (this.target){
            if (this.target == 'Error'){
                var change = {type: this.target, data:this.data.changes};
                this.configChange.emit(change);            
            }else{
                var change = {type: 'Duplicate',data: this.data.changes};
                this.configChange.emit(change);            
            }
    
            if(this.target == 'Error'){            
                for (let envData of this.envs){
                    getExpectedError(envData);
                }            
            }else{            
                for (let envData of this.envs){
                    getExpectedDupicates(envData);
                }            
            }
          
    
          }
          this.resetQueue();
    }

    set_level(){
        var updated_rules = this.envData.errors_cfg.queues.checked.filter((rule:any)=>rule.Name == this.source.name && rule.Category == this.source.category)
        for (var rule of updated_rules){
            var new_rule:any = {};
            for (var key in rule){
                new_rule[key] = rule[key]
            }
            new_rule.id = getNewId(this.envData.errors_cfg.queues.added);
            new_rule.original_id = rule.id
            rule.updated = true;
            new_rule.level_updated = true;
            new_rule.Level = this.source.level;
            this.envData.errors_cfg.queues.added.push(new_rule)
        }
        var change = {type:"Error",data:[{operation:'level',change:this.source}]}
        this.configChange.emit(change);
        this.source = {};
    }

    update_level(){ 
        this.level_updated = !this.level_updated;
    }
    getLevels(){
        this.source.old_level = this.data.categories[this.source.category][this.source.name];
        return ['Low','Medium','High'].filter( (e)=> e !=this.data.categories[this.source.category][this.source.name]);
    }
    new_rule(){
        this.data.title  = "New Rule";        
        var dialogRef = this.dialog.open(ConfigDialog,{data:this.data,width:"800px"});
        dialogRef.afterClosed().subscribe(this.updateResult.bind(this));

    }

    reset(){
        this.new_item = {};
        this.candidates = {};
        this.isSaveEnabled = false;
        if (this.target == "Error"){
            this.total = this.envData.error_num;        
        }else{            
            this.total =  this.envData.duplicate_steps;            
        }                
    }
    
    resetQueue(){
        if (this.data.isRule){
          this.data.queues.checked = this.envData.errors_cfg.queues.checked.filter((item:any)=>
            item.Name == this.data.name&&item.Category == this.data.category&&item.Level==this.data.level);
          this.data.queues.removed = this.envData.errors_cfg.queues.removed.filter((item:any)=>
            item.Name == this.data.name&&item.Category == this.data.category&&item.Level==this.data.level);
          this.data.queues.added = this.envData.errors_cfg.queues.added.filter((item:any)=>
            item.Name == this.data.name&&item.Category == this.data.category&&item.Level==this.data.level);
        }
      }
    

    
}