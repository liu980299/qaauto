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
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import {MatCardModule} from '@angular/material/card';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatBadgeModule} from '@angular/material/badge';
import {MatSortModule} from '@angular/material/sort';
import { NgChartsModule } from 'ng2-charts';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatChipsModule} from '@angular/material/chips';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatDialogModule} from '@angular/material/dialog';
import {DialogChangeDialog} from './dialog.component';
import { LogUnitComponent } from './log.component';
import { LogGroupComponent } from './group.component';
import { ScenarioComponent } from './scenario.component';
import { SummaryComponent } from './summary.component';
import { ConfigDialog } from './rule.component';



@NgModule({
  declarations: [
    AppComponent,
    DialogChangeDialog,
    LogUnitComponent,
    LogGroupComponent,
    ScenarioComponent,
    SummaryComponent,
    ConfigDialog
  ],
  imports: [
    HttpClientModule,
    MatTreeModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    BrowserModule,
    MatTableModule,
    AngularSplitModule,
    MatMenuModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatSliderModule,
    MatExpansionModule,
    MatBadgeModule,
    MatSelectModule,
    MatSortModule,
    MatChipsModule,
    NgChartsModule,
    MatDialogModule,
    MatAutocompleteModule
    
  ],
  providers: [DataService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
