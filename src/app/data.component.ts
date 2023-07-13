import { HttpClient } from '@angular/common/http'; 
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
declare var report_url: any;
@Injectable()
export class DataService {    
   constructor(private http: HttpClient) {
        this.getJSON().subscribe(data => {
            console.log(data);
        });
    }


    public getCrumb():Observable<any>{        
        return this.http.get(location.origin + "/crumbIssuer/api/json");
    }

    public getUser():Observable<any>{
        return this.http.get(location.origin + "/me/api/json");
    }
    public getJSON(): Observable<any> {
        return this.http.get(report_url + "./analysis.json");
    }
    public getData(json_url:string): Observable<any>{
        if (json_url.indexOf("http")>=0){
            return this.http.get(json_url);
        }else{
            return this.http.get(report_url + json_url);
        }
        

    }
}