import { NgModule,ApplicationInitStatus, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularSplitModule } from 'angular-split';
import { DataService } from './data.component';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTreeModule} from '@angular/material/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table'
import { NgChartsModule } from 'ng2-charts';



@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    MatTreeModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    BrowserModule,
    MatTableModule,
    AngularSplitModule,
    BrowserAnimationsModule,
    NgChartsModule
  ],
  providers: [DataService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
