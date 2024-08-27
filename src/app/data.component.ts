import { HttpClient } from '@angular/common/http'; 
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as JSZip from 'jszip';
const JSZipUtils = require('jszip-utils');


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
    public async getZip(zip_url:string,filename:string): Promise<any>{
        return new Promise(function(resolve, reject){
            if (location.href.indexOf("localhost") >= 0 && zip_url.indexOf("assets") <0){
                zip_url = "assets/" + zip_url;
            }
            JSZipUtils.getBinaryContent(zip_url, function(err:any,data:any){if(err){
                reject(err);
            }
            const zipFile = new JSZip();                        
            zipFile.loadAsync(data).then(function(zip){
                if(zip){
                    var jsonData = zip.file(filename);
                    if (jsonData){
                        jsonData.async("string").then((content)=>{
                            resolve( JSON.parse(content));                            
                            })
                        }
                    }
                
                })
            });        
        });
    
    }               
}