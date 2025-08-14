import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SHeaderComponent } from '../s-header/s-header.component';
import { SSidenavbarComponent } from '../s-sidenavbar/s-sidenavbar.component';

@Component({
  selector: 'app-phone-reserve',
 imports: [
    CommonModule,
    RouterModule,
    SHeaderComponent,
    SSidenavbarComponent
  ],  
  templateUrl: './phone-reserve.component.html',
  styleUrl: './phone-reserve.component.css'
})
export class PhoneReserveComponent implements OnInit{

  constructor(){}

  ngOnInit(): void {
      
  }

}
