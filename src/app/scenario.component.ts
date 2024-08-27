import {Component,EventEmitter,Input, Output} from '@angular/core';

export function getErrorBadgeText(step:any){    
    var expected_error = true;
    var errors:any = {};
    var expected_scenario_error = true;
    var scenario = step.scenario;
    
    if(scenario.error_summary.length > 0){
        for(let error of scenario.error_summary){
            errors[error.name] = !!error.expected
            expected_error = expected_error && errors[error.name]
        }        
        for (let error of step.errors){
            error.expected = errors[error.name]            
        }
        if (expected_error){
            if (step.badgeText == "D,E"){
                step.badgeText = "D";
            }else{
                step.badgeText = "";
            }
        }else{
            if (step.badgeText == "D"){
                step.badgeText = "D,E";
            }else{                
                step.badgeText = "E";
            }
        }    
        for (let worker of step.worker_list){            
            if (worker.error){
                var worker_error = worker.error.expected;
                // for (let error of worker.errors){
                //     worker_error = worker_error && errors[error.name];
                // }
                if(worker_error){
                    if (worker.badgeText == "D,E"){
                        worker.badgeText = "D"
                    }else{
                        worker.badgeText = ""
                    }    
                }else{
                    if (worker.badgeText == "D"){
                        worker.badgeText = "D,E"
                    }else{
                        worker.badgeText = "E"
                    }    

                }
            }                
        }    
    }

}

export function  getBadgeText(step:any){
    var scenario = step.scenario;
    var expected_num = 0;
    if (step.duplicated){
        for (let duplicate_name in step.expected){
            if (step.expected[duplicate_name]){
                expected_num++;
            }                
        }
        if (expected_num == step.duplicated.length){
            if (step.badgeText == "D,E"){
                step.badgeText = "E";
            }else{
                step.badgeText = "";
            }
            step.is_duplicate_expected = true;
            checkScenario(scenario);            
        }else{
            if (step.badgeText == "E"){
                step.badgeText = "D,E";
            }else{
                step.badgeText = "D";
            }
            step.is_duplicate_expected = false;
            scenario.is_duplicate_expected = false;
        }
        for (let worker of step.worker_list){            
            if (step.expected[worker.name]){
                if (worker.badgeText == "D,E"){
                    worker.badgeText = "E"
                }else{
                    worker.badgeText = ""
                }
            }
        }    
    }
}
export function getExpectedDupicates(envData:any){
    envData.expected_steps = 0;
    for (let scenario in envData.tests){
        for (let step of envData.tests[scenario].steps){
            if(step.is_duplicate_expected){
                envData.expected_steps++;
            }
        }
    }
}

export function getExpectedError(envData:any){
    envData.expected_errors = 0;
    for (let scenario_name in envData.tests){
        var scenario = envData.tests[scenario_name];
        if (scenario.error_summary.length > 0){
            for(let error of scenario.error_summary){
                if (error.expected){
                    envData.expected_errors += error.steps.length;
                }
            }

        }
    }

}

export function getDuplicateTargets(envs:any, rule:any){
    var targets = [];
    for (let envData of envs){        
        if (rule.Step in envData.duplicates_cfg.data){
            var step_cfg = envData.duplicates_cfg.data[rule.Step]
            for (let scenario of rule.Scenario){
                if  (scenario in step_cfg){
                    var scenario_cfg = step_cfg[scenario];
                    for (let duplicate of rule.Duplicate){
                        if (duplicate in scenario_cfg){
                            for (let target of scenario_cfg[duplicate]){
                                if (!target.expected[duplicate]){
                                    target.expected[duplicate] = true;
                                    getBadgeText(target)
                                }
                                targets.push(target);    
                            }
                        }
                    }
                }                
            }
        }        
    }
    return targets;
}

function   checkScenario(scenario:any){
    var is_duplicate_expected = true;
    for(let duplicate of scenario.duplicate_summary){
        for (let step of duplicate.steps){
            if (!step.is_duplicate_expected){
                is_duplicate_expected = false;
            }
        }
    }
    scenario.is_duplicate_expected = is_duplicate_expected;
}

export function getNewId(queue:any){
    var new_id = 1;
    if (queue.length > 0){
        new_id = queue[queue.length - 1].id + 1;    
    }
    return new_id
}

@Component({    
    selector:'scenario',
    templateUrl:'scenario.component.html',
    styleUrls: ['scenario.component.css']

})
export class ScenarioComponent {
    @Input() scenario:any;
    @Input() envData:any;
    @Input() configure:any;
    @Input() parent:any;
    @Output() configChange = new EventEmitter<string>()
    options = ["Globally for all tests","All steps in this test"];
    step_options = ["Globally for any test","this step in this test"];
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
    changeDuplicate(duplicate:any,step:any,scenario:any){
        var del_duplicate = null;
        var index = 0;
        var step_name = step.name.trim().replace(step.name.split(" ",1)[0] + " ","");
        for (var duplicate_cfg of this.envData.duplicates_cfg.queues.added){
            if (duplicate_cfg.Step == step_name &&  duplicate_cfg.Scenario.length==1 && duplicate_cfg.Scenario[0]== scenario.name && 
                duplicate_cfg.Duplicate.length==1 && duplicate_cfg.Duplicate[0] == duplicate.name){
                del_duplicate = duplicate_cfg;
                break;
            }
            index++;
        }
        if (step.expected[duplicate.name]){
            if (!del_duplicate){
                var new_rule = {Duplicate:[duplicate.name],Scenario:[scenario.name],Step:step_name,target:[step],id:getNewId(this.envData.duplicates_cfg.queues.added)}
                new_rule.target = getDuplicateTargets(this.parent,new_rule);
                this.envData.duplicates_cfg.queues.added.push(new_rule);
            }
        }
        else{
            if (del_duplicate){
                this.envData.duplicates_cfg.queue.added.splice(index,1); 
            }
        }
        this.configChange.emit('Duplicate');
        getBadgeText(step);
        getExpectedDupicates(this.envData);

    }
    changeError(error:any,scenario:any,envData:any){
        var del_error = null;
        var index = 0;
        for (var err_cfg of envData.errors_cfg.queues.added){
            if (err_cfg.Error == error.name &&  err_cfg.Scenario.length==1 && err_cfg.Scenario[0]== scenario.name){
                del_error = err_cfg;
                break;
            }
            index++;
        }
        if (error.expected){
            if (!del_error){
                var new_id = getNewId(this.envData.errors_cfg.queues.added)
                envData.errors_cfg.queues.added.push({Error:error.name,Scenario:[scenario.name],target:[error],id:new_id});
                error.cfg_id = new_id;
            }
        }
        else{
            if (del_error){
                envData.errors_cfg.queues.added.splice(index,1); 
            }
        }
        for(let step of error.steps){
            for (let step_error of step.errors){
                if (step_error.name == error.name){
                    step_error.expected = error.expected;
                }
            }            
            getErrorBadgeText(step);
        }
        this.configChange.emit('Error');
        getExpectedError(envData);
    }
    setErrorExpected(error:any,option:string){
        if (!this.envData.expected){
            this.envData.expected = {};            
        }
        if (!this.envData.expected.errors){
            this.envData.expected.errors = [];
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
    reset(): void {
        this.showErrors = false;
        this.buttonTxtErrors = "Show Erros Summary";
        this.showDuplicated = false;
        this.buttonTxtDuplicated = "Show Duplicates Summary";         
    }    

}