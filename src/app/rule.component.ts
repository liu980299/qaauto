import {Component,Inject} from '@angular/core';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { Observable, map, startWith } from 'rxjs';
import { getBadgeText, getErrorBadgeText,getExpectedDupicates,getExpectedError,getNewId } from './scenario.component';

export function lengthValidator(): ValidatorFn {
    return (control:AbstractControl) : ValidationErrors | null => {
  
        const value = control.value;
  
        if (!value) {
            return null;
        }
            
        return !(value.length > 10) ? {length:true}: null;
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
    targetCtrl = new FormControl('',{validators:[lengthValidator()],updateOn:'change'});
    commentCtrl = new FormControl('',{validators:[lengthValidator()],updateOn:'change'});
    new_item:any = {};
    isSaveEnabled:boolean = false;
    disabled:any = {};
    candidates:any = {};
    scenarios:any = {};

    constructor(public dialogRef:MatDialogRef<ConfigDialog>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
        if(this.data){
            this.target = this.data.headers[0];            
            this.headers = this.data.headers.slice(1).filter((item: any)=>this.data.multiple_list.indexOf(item)>=0||this.data.single_list.indexOf(item)>=0);                        
            this.multiple_list = this.data.multiple_list;
            this.candidates[this.target] = [];
            this.scenarios = this.data.scenarios;
            for (let target in this.data.data){
                this.candidates[this.target].push(target);
            }            
            this.filteredErrors = this.targetCtrl.valueChanges.pipe(
                startWith(null),
                map((target: string | null) => (target ? this._filter(target) : this.candidates[this.target].slice())),
        
            )    
        }
      }

      addNew(){        
        var added:any = [];
        for (let item of this.data.queues.added){
            added.push(item);
        }
        var new_item:any = {};
        new_item[this.target] = this.targetCtrl.value;
        new_item.id = getNewId(this.data.queues.added);
        for (let key in this.new_item){
            
            if (key == "target"){
                new_item.target = [];
                for (let target of this.new_item.target){
                    new_item.target.push(...target);
                }
            }else{
                new_item[key] = this.new_item[key];
            }
            this.new_item[key] = null;
        }
        added.push(new_item);
        for (let target of new_item.target){
            if (this.target == 'Step'){
                for (let duplicate of new_item.Duplicate){
                    if (duplicate in target.expected){
                        target.expected[duplicate] = true;
                        target.disabled[duplicate] = true;                        
                        getBadgeText(target);
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

        this.data.queues.added = added;
        this.targetCtrl.setValue(null);
        this.commentCtrl.setValue(null);        
        this.isSaveEnabled = false;
    }


      setComment() {
        if (this.commentCtrl.value && this.commentCtrl.value.length > 10){
            this.new_item['Comment'] = this.commentCtrl.value;
            this.isSaveEnabled = true;
            for (let header of this.data.headers){
                if (!this.new_item[header]){
                    this.isSaveEnabled = false;
                    break;
                }
            }
        }else{
            this.isSaveEnabled = false;
        }
    }
    setTarget() {
        var value = this.targetCtrl.value;
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

    changeValue(header: string,$event: MatSelectChange) {
        var index = this.data.headers.indexOf(header);
        
        if (index >= 0){
            var target = $event.value;            
            this.new_item[this.data.headers[index]] = target;            
            if (index < this.data.headers.length - 1){
                for (var i = index + 1; i < this.data.headers.length; i++){
                    if (this.data.headers[i] in this.new_item){
                        this.new_item[this.data.headers[i]] = null;                        
                        this.disabled[this.data.headers[i]] = false;
                    }
                    this.candidates[this.data.headers[index + 1]] = [];
                }                
                var next_header =  this.data.headers[index+1];
                this.candidates[next_header] = [{name:"All",target:{}}]; 
                var options_dict:any = {};
                for (let candidate of this.candidates[this.data.headers[index]]){
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
                this.new_item.target = [];
                for(var option in options_dict){
                    this.candidates[this.data.headers[index+1]].push({name:option,target:options_dict[option]});
                    if (this.target == 'Error'){
                        this.new_item.target.push(options_dict[option]);
                    }else{
                        this.new_item.target.push(...options_dict[option]);
                    }
                    
                }
            }                        
            if (this.multiple_list.indexOf(header) >= 0){
                if (target.indexOf('All') >=0){
                    this.disabled[header] = true;
                }else{
                    this.disabled[header] = false;
                }
            }
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

 
  }