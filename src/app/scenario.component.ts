import {Component,Input} from '@angular/core';

@Component({    
    selector:'scenario',
    templateUrl:'scenario.component.html',
    styleUrls: ['scenario.component.css']

})
export class ScenarioComponent{    
    @Input() scenario:any;
    @Input() envData:any;
    @Input() configure:any;
    buttonTxtDuplicated = "Show Duplicates Summary";
    showDuplicated = false;
    showErrors = false;
    buttonTxtErrors = "Show Errors Summary";
    setErrorButton(){
        this.showErrors = !this.showErrors
        if (this.showErrors){
            this.buttonTxtErrors = "Hide Errors Summary";
        }else{
            this.buttonTxtErrors = "Show Errors Summary";
        }
    }
    hasStepError(step:any){
        if(this.scenario.error_text && step.errors){
            for(let error of step.errors){
                if(error.name == this.scenario.error_text){
                    return true;
                }                    
            }
        }
        return false;
    }
    gotoStep(step:any){
        document.getElementById(step.id)?.scrollIntoView();
    }
    setDuplicateButton(){
        this.showDuplicated = !this.showDuplicated;
        if (this.showDuplicated){
            this.buttonTxtDuplicated = "Hide Duplicates Summary";
        }else{
            this.buttonTxtDuplicated = "Show Duplicates Summary";
        }
    }

}