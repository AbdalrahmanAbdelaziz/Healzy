import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LoginResponse } from '../../../shared/models/login-response';
import { UserService } from '../../../services/user.service';
import { BASE_URL } from '../../../shared/constants/urls';

@Component({
  selector: 'app-side-navbar',
  imports: [CommonModule,RouterModule],
  templateUrl: './side-navbar.component.html',
  styleUrl: './side-navbar.component.css'
})

export class SideNavbarComponent implements OnInit {
  isCollapsed: boolean = true; // Default state: Closed
  patient!: LoginResponse;
  BASE_URL = BASE_URL;
  constructor(private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    // Retrieve sidebar state from local storage
    const savedState = localStorage.getItem('sidebarCollapsed');
    this.isCollapsed = savedState ? JSON.parse(savedState) : true; // Default to closed if no value

    this.userService.userObservable.subscribe((newUser) => {
      if (newUser) {
        this.patient = newUser;
      }
    });
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebarCollapsed', JSON.stringify(this.isCollapsed)); // Save state
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}