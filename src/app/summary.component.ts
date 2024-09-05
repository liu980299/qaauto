import {Component,EventEmitter,Input, OnInit, Output} from '@angular/core';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { Observable, map, startWith } from 'rxjs';
import { ConfigDialog } from './rule.component';
import { getBadgeText,getErrorBadgeText,getExpectedDupicates,getExpectedError } from './scenario.component';
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
    selector:'summary',
    templateUrl:'summary.component.html'    
})
export class SummaryComponent implements OnInit{
    @Input() data:any;
    @Input() envData:any;
    @Input() envs:any;
    @Output() configChange = new EventEmitter<string>()
    target : string;    
    single_list = [];    
    headers : any;
    multiple_list = ["Scenario","Step"];
    filteredErrors: Observable<string[]>;
    errorCtrl = new FormControl('',{validators:[lengthValidator()],updateOn:'change'});
    commentCtrl = new FormControl('',{validators:[lengthValidator()],updateOn:'change'});
    new_item:any = {};
    total = 0;
    expected_num =  0;
    isSaveEnabled:boolean = false;
    candidates:any = {};
    constructor(public dialog:MatDialog){
        this.filteredErrors = this.errorCtrl.valueChanges.pipe(
            startWith(null),
            map((error: string | null) => (error ? this._filter(error) : this.candidates['Error'].slice())),
    
        )
    }
    ngOnInit(): void {
        if(this.data){
            this.data.scenarios=this.envData.tests;   
            this.data.envs = this.envs;         
            this.target = this.data.headers[0];    
            this.headers = this.data.headers;            
            this.single_list = this.data.headers.filter((item:any)=>this.data.multiple_list.indexOf(item)<0);
            this.candidates[this.target] = [];
            for (let target in this.data.data){
                this.candidates[this.target].push(target);
            }                        
            this.reset();
        }
        
    }


    addRemoved(row: any) {
        var index = -1;
        var checked = [];
        for (var i=0;i<this.data.queues.checked.length;i++){
            if(this.data.queues.checked[i].id == row.id){
                index = i;                
            }else{
                checked.push(this.data.queues.checked[i]);
            }

        }
        if(index >=0){
            var removed = [];            
            for (let item of this.data.queues.removed){
                removed.push(item);
            }
            removed.push(row);
            this.data.queues.removed = removed;
            this.data.queues.checked = checked;
        }
        
    }
    removeRemoved(row:any){
        var index = -1;
        var removed = [];
        for (var i=0;i<this.data.queues.removed.length;i++){
            if(this.data.queues.removed[i].id == row.id){
                index = i;                
            }else{
                removed.push(this.data.queues.removed[i]);
            }

        }
        if(index >=0){
            var checked = [];            
            for (let item of this.data.queues.checked){
                checked.push(item);
            }
            checked.push(row);
            this.data.queues.removed = removed;
            this.data.queues.checked = checked;
        }
    }
    removeAdded(element: any) {
        var added = [];
        for (var item of this.data.queues.added){
            if (item.id != element.id){
                added.push(item);
            }else{
                for(let target of item.target){
                    if (this.target == "Error"){
                        target.expected = false;                        
                        for (let step of target.steps){                            
                            getErrorBadgeText(step);
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

        this.data.queues.added = added;
        if (this.target == 'Error'){
            this.configChange.emit(this.target);            
        }else{
            this.configChange.emit('Duplicate');            
        }

        
        
    }
    new_rule(){
        var dialogRef = this.dialog.open(ConfigDialog,{data:this.data,width:"800px"});
        dialogRef.afterClosed().subscribe((result)=>{
          if(result){
            console.log(result);
          }
          if (this.target == 'Error'){
            this.configChange.emit(this.target);            
            }else{
            this.configChange.emit('Duplicate');            
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
      
        })      

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
    
    
    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
    
        return this.candidates['Error'].filter((error: string) => error.toLowerCase().includes(filterValue));
      }

    
}