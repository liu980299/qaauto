import {Component,Inject} from '@angular/core';
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';


@Component({
    selector: 'dialog-change',
    templateUrl: 'dialog.component.html'    
  })
  export class DialogChangeDialog {
    constructor(public dialogRef:MatDialogRef<DialogChangeDialog>,
      @Inject(MAT_DIALOG_DATA) public data: any) {}
  }