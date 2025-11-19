import { Component, OnInit } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements OnInit {

  isLoading: boolean = false;

  constructor(private loadingService: LoaderService) {
    this.loadingService.getIsLoading().subscribe((loading) => {
      this.isLoading = loading;
    });
  }

  ngOnInit(): void {}
}
