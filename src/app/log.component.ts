import {Component,Input} from '@angular/core';

@Component({    
    selector:'log-unit',
    templateUrl:'log.component.html',
    styleUrls: ['log.component.css']

})
export class LogUnitComponent{
    @Input() logUnit:any;
    @Input() stacks:any;
    openStack(stack:any){
        if (!stack.msg && stack.exception in this.stacks[stack.log_file]){
        stack.msg = this.stacks[stack.log_file][stack.exception][stack.index];
        }                    
        console.log(this.logUnit)
    }
}