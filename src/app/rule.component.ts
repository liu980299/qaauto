import {Component,Inject} from '@angular/core';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { Observable, map, startWith } from 'rxjs';
import { getBadgeText, getErrorBadgeText,getExpectedDupicates,getExpectedError,getNewId } from './scenario.component';
import { MatCheckboxChange } from '@angular/material/checkbox';

export function lengthValidator(size:number): ValidatorFn {
    return (control:AbstractControl) : ValidationErrors | null => {
  
        const value = control.value;
  
        if (!value) {
            return null;
        }
            
        return !(value.length > size) ? {length:true}: null;
    }
  }

  export function uniqueValidator(names:any): ValidatorFn {
    return (control:AbstractControl) : ValidationErrors | null => {
  
        const value = control.value;
  
        if (!value) {
            return null;
        }
            
        return names.indexOf(value)>=0 ? {nonUnique:true}: null;
    }
  }
  


@Component({
    selector: 'dialog-config',
    templateUrl: 'rule.component.html'    
  })
  export class ConfigDialog {

    target : string;    
    single_list = ["Error","Duplicate","Comment"];
    headers : any;
    multiple_list :any;
    filteredErrors: Observable<string[]>;
    filteredNames: Observable<string[]>;
    filteredCategory: Observable<string[]>;
    names:any = [];
    targetCtrl = new FormControl('',{validators:[lengthValidator(10)],updateOn:'change'});
    nameCtrl = new FormControl('',{validators:[],updateOn:'change'});
    categoryCtrl = new FormControl('',{validators:[lengthValidator(3)],updateOn:'change'});
    commentCtrl = new FormControl('',{validators:[lengthValidator(3)],updateOn:'change'});
    new_item:any = {};
    old_item:any;    
    queues:any;
    categories:any = [];
    isSaveEnabled:boolean = false;
    disabled:any = {};
    candidates:any = {};
    scenarios:any = {};
    isEditor = false;
    isNew = false;

    constructor(public dialogRef:MatDialogRef<ConfigDialog>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
        console.log(this.data);
        if(this.data){
            this.nameCtrl.setValidators([uniqueValidator(this.names)])
            this.target = this.data.headers[0]; 
            this.data.changes =[];
            if (this.data.isRule){
                this.new_item['Category'] = this.data.category;
                this.new_item['Name'] = this.data.name;
                this.new_item['Level'] = this.data.level;
                this.categoryCtrl.setValue(this.new_item['Category']);
                this.nameCtrl.setValue(this.new_item['Name']);
                this.nameCtrl.disable({onlySelf:true});
                this.categoryCtrl.disable({onlySelf:true});
                this.queues = this.data.envs[0].errors_cfg.queues;
                this.data.data = this.data.envs[0].errors_cfg.data;
                this.data.required = this.data.envs[0].errors_cfg.required;            
            }else{
                this.queues = this.data.queues;
            }            
            for(let category in this.data.categories){
                this.categories.push(category);
            }
            if(this.data.current_id){
                this.isEditor = true;
                for (let item of this.queues.checked){
                    if (item.id == this.data.current_id){
                        this.old_item = item;
                        for (let key in item){
                            this.new_item[key] = item[key];
                        }                                     
                        this.targetCtrl.setValue(this.new_item[this.target]);
                        this.setTarget(this.new_item[this.target]);
                        this.categoryCtrl.setValue(this.new_item['Category']);
                        this.nameCtrl.setValue(this.new_item['Name']);
                        this.commentCtrl.setValue(this.new_item['Comment']);
                        console.log(this.new_item['Comment'])
                        console.log(this.commentCtrl);
                        break;
                    }
                }
                
            }else{
                if (this.data.updated){
                    this.old_item = this.data.updated;
                    for (let key in this.data.updated){
                        this.new_item[key] = this.data.updated[key];                        
                    }                                     
                    this.targetCtrl.setValue(this.new_item[this.target]);
                    this.setTarget(this.new_item[this.target]);
                    this.categoryCtrl.setValue(this.new_item['Category']);
                    this.nameCtrl.setValue(this.new_item['Name']);
                    this.commentCtrl.setValue(this.new_item['Comment']);

                }else{
                    if (this.data.new_error){
                        this.targetCtrl.setValue(this.data.new_error);
                        this.new_item['Error'] = this.data.new_error;
                        this.setTarget(this.data.new_error);
                    }
                }
            }    

            this.headers = this.data.headers.slice(1).filter((item: any)=>this.data.multiple_list.indexOf(item)>=0||this.data.single_list.indexOf(item)>=0);                        
            this.multiple_list = this.data.multiple_list;
            this.candidates[this.target] = [];
            this.scenarios = this.data.tests;
            for (let target in this.data.data){
                this.candidates[this.target].push(target);
            }            
            this.filteredErrors = this.targetCtrl.valueChanges.pipe(
                startWith(null),
                map((target: string | null) => (target ? this._filter(target) : this.candidates[this.target].slice())),
        
            )    
            this.filteredNames = this.nameCtrl.valueChanges.pipe(
                startWith(null),
                map((target: string | null) => (target ? this._filterName(target) : this.names.slice())),
        
            )    
            this.filteredCategory = this.categoryCtrl.valueChanges.pipe(
                startWith(null),
                map((target: string | null) => (target ? this._filterName(target) : this.categories.slice())),
        
            )    

            console.log(this);
        }
      }

      set_auto_link($event: MatCheckboxChange) {
        this.new_item.auto_link = $event.checked;
    }
    
    setCategory(name: any) {
        this.new_item['Category'] = name;
        if (name in this.data.categories){
            this.names = []
            for (let item in this.data.categories[name]){
                this.names.push(item);
            }
        }else{
            this.names = [];
            this.isNew = true;
        }    
        this.nameCtrl.setValue(null);
    }
    
    submit() {
        if (!this.data.updated){
            this.addNew();
            this.dialogRef.close(this.queues.added);
        }else{
            for (let key in this.new_item){            
                if (key == "target"){
                    this.data.updated.target = [];
                    for (let target of this.new_item.target){
                        if (Array.isArray(target) && target.length > 0){
                            this.data.updated.target.push(...target);
                        }
                    }
                }else{
                    this.data.updated[key] = this.new_item[key];
                }
                if (!this.data.current_id){
                    this.new_item[key] = null;
                }            
            }    
        }
    }    

      addNew(){        
        var added:any = [];
        if (!this.data.updated){

        }
        for (let item of this.queues.added){
            added.push(item);
        }
        var new_item:any = {};
        if (this.data.current_id){            
            this.old_item.updated = true;
            new_item.original_id = this.data.current_id;
        }
        new_item[this.target] = this.targetCtrl.value;
        new_item.id = getNewId(this.queues.added);
        for (let key in this.new_item){
            
            if (key == "target"){
                new_item.target = [];
                for (let target of this.new_item.target){
                    if (Array.isArray(target) && target.length > 0){
                        new_item.target.push(...target);
                    }
                }
            }else{
                new_item[key] = this.new_item[key];
            }
            if (!this.data.current_id){
                this.new_item[key] = null;
            }            
        }
        added.push(new_item);
        if (this.old_item){
            if(this.old_item.Error == new_item.Error){
                this.data.changes.push({operation:"update", rule:new_item});
                new_item.children = this.old_item.children;
                new_item.scenario_list = this.old_item.scenario_list;
            }else{
                this.data.changes.push({operation:"remove",rule:this.old_item});
                this.data.changes.push({operation:"new",rule:new_item});
            }
        }else{
            this.data.changes.push({operation:"new", rule:new_item});
        }
        
        for (let target of new_item.target){
            if (this.target == 'Step'){
                for (let duplicate of new_item.Duplicate){
                    if (duplicate == 'All'){
                        for (let item in target.expected){
                            target.expected[item] = true;
                            target.disabled[item] = true;
                        }
                        getBadgeText(target)
                    }else{
                        if (duplicate in target.expected){
                            target.expected[duplicate] = true;
                            target.disabled[duplicate] = true;                        
                            getBadgeText(target);
                        }    
                    }
                }                
            }else{
                for (let target of new_item.target){
                    target.expected = true;
                    for (let step of target.steps){                        
                        getErrorBadgeText(step);
                    }
                }
            }
            
        }

        this.queues.added = added;
        this.targetCtrl.setValue(null);
        this.commentCtrl.setValue(null);        
        this.isSaveEnabled = false;
    }


      setComment() {
        if (this.commentCtrl.value && this.commentCtrl.value.length > 4){
            this.new_item['Comment'] = this.commentCtrl.value;
            this.isSaveEnabled = true;
            for (let header of this.data.required){
                if (!this.new_item[header]){
                    this.isSaveEnabled = false;
                    break;
                }
            }
        }else{
            this.isSaveEnabled = false;
        }
        if (this.isSaveEnabled && !this.new_item.target){
            this.setTargets();
        }  
    }
    setTarget(value:any) {        
        console.log(value);
        if (value && value.length > 10){            
            this.new_item[this.target] = value;
            this.candidates['Scenario'] = [{name:'All',target:{}}];            
            var items = value.split("{}");
            for (let option in this.data.data){
                if (items.filter((item:string)=>option.indexOf(item)<0).length==0){
                    for (let scenario in this.data.data[option]){
                        this.candidates['Scenario'].push({name:scenario,target:this.data.data[option][scenario]});
                    }                    
                }
            }
        }
        console.log(this.candidates['Scenario']);

    }

    changeLevel($event: MatSelectChange){
        this.new_item['Level']=$event.value;
    }

    setTargets(){
        if (!this.new_item.target){
            this.new_item.target = []
            if (!this.candidates[this.target]){
                this.setTarget(this.new_item[this.target]);
            }
            if(this.target == 'Error'){
                
                if (this.new_item['Scenario']){
                    if (this.new_item['Scenario'][0]  == 'All'){
                        for (let candidate of this.candidates['Scenario']){
                            if (candidate.name != 'All'){
                                this.new_item.target.push(candidate.target);                                
                            }
                        }
                        this.disabled['Scenario'] = true;
                    }else{
                        for (let candidate of this.candidates['Scenario']){
                            if (this.new_item['Scenario'].indexOf(candidate.name) >=0){
                                this.new_item.target.push(candidate.target);
                            }                            
                        }
                    }                    
                }
            }else{
                this.candidates["Duplicate"] = [{name:"All",target:{}}];
                var options_dict:any = {};
                for (let candidate of this.candidates["Scenario"]){
                    var options = candidate.target                     
                    if (this.new_item['Scenario'][0] != "All"){
                        for (var item of this.new_item['Scenario']){                                             
                            if (candidate.name == item){                                
                                for (var option in options){
                                    if (option in options_dict){
                                        options_dict[option].push(options[option])
                                    }else{
                                        options_dict[option] = [options[option]]
                                    }                                                                                        
                                }                                    
                            }                                
                        }
                    }else{ 
                        this.disabled['Scenario'] = false;                                               
                        for (var option in options){
                            if (option in options_dict){
                                options_dict[option].push(options[option])
                            }else{
                                options_dict[option] = [options[option]]
                            }                                                                                                            
                        }                                    
                    }                                            
                }
                var option_list: string[] = [];
                for(var option in options_dict){
                    this.candidates["Duplicate"].push({name:option,target:options_dict[option]});                    
                    option_list.push(option);
                }
                if (this.new_item["Duplicate"]){
                    this.new_item["Duplicate"] = this.new_item["Duplicate"].filter((item: string)=>option_list.indexOf(item)>=0);
                }
                for(let api of this.new_item["Duplicate"]){
                    this.new_item.target.push(...options_dict[api]);
                }
            }
        }
    }
    
    setName(name: string) {    
        if (name && name.length > 4){
            this.new_item['Name'] = name;
            if (this.names.indexOf(name) >= 0){
                this.isNew = false;
                this.new_item["Level"] = this.data.categories[this.new_item['Category']][name];
            }else{
                this.isNew = true;
            }
            this.isSaveEnabled = true;
            for (let header of this.data.required){
                if (!this.new_item[header]){
                    this.isSaveEnabled = false;
                    break;
                }
            }
        }
    }

    changeValue(header: string,$event: MatSelectChange) {
        var index = this.data.headers.indexOf(header);                
        if (index >= 0){
            var target = $event.value;          
            if ($event.value.length == 0){
                this.new_item[header] = null;
                this.disabled[header] = false;                
            }  
            if (target){
                this.new_item[header] = target;                        
            }            
            if (header == 'Scenario' && this.target == 'Step'){
                this.new_item["Duplicate"] = null;
                this.disabled["Duplicate"] = false;
                this.candidates["Duplicate"] = [{name:"All",target:{}}];
                var options_dict:any = {};
                for (let candidate of this.candidates["Scenario"]){
                    var options = candidate.target                     
                    if (this.new_item[this.data.headers[index]][0] != "All"){
                        for (var item of this.new_item[this.data.headers[index]]){                                             
                            if (candidate.name == item){                                
                                for (var option in options){
                                    if (option in options_dict){
                                        options_dict[option].push(options[option])
                                    }else{
                                        options_dict[option] = [options[option]]
                                    }                                                                                        
                                }                                    
                            }                                
                        }
                    }else{                                                
                        for (var option in options){
                            if (option in options_dict){
                                options_dict[option].push(options[option])
                            }else{
                                options_dict[option] = [options[option]]
                            }                                                                                                            
                        }                                    
                    }                                            
                }
            }            
        }
        var required_list = this.data.headers;
        if (this.data.required){
            required_list = this.data.required;
        }
        this.isSaveEnabled = true;
        for (var required of required_list){
            if (!this.new_item[required] || this.new_item[required].length== 0){
                this.isSaveEnabled = false;                
            }            
        }
        if (!this.new_item.target){
            this.setTargets();
        }

    }
    

      private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        if ( this.target== 'Error'){
            return this.candidates['Error'].filter((error: string) => error.toLowerCase().includes(filterValue));
        }else{
            return this.candidates['Step'].filter((error: string) => error.toLowerCase().includes(filterValue));
        }
        
      }

      private _filterName(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.names.filter((error: string) => error.toLowerCase().includes(filterValue));
      }

 
  }