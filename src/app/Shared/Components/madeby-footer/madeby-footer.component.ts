import { Component } from '@angular/core';

@Component({
  selector: 'app-madeby-footer',
  standalone: true,
  templateUrl: './madeby-footer.component.html',
  styleUrls: ['./madeby-footer.component.css']
})
export class MadebyFooterComponent {
  authorName = 'Harold Gaviria'; 
  projectName = 'Angular 19'; 
}
