import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-8">
      <div class="text-center">
        <p class="text-sm text-slate-600">Opening organization...</p>
      </div>
    </div>
  `,
})
export class OrganizationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    // For now, just navigate to the main task board; backend scoping uses JWT's org
    // In a multi-org context, you'd switch org context on the server or via an API call
    void this.router.navigate(['/tasks'], { queryParams: { orgId: id } });
  }
}
