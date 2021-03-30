import { NgModule } from '@angular/core';
import { DashletComponent, ChartJsComponent } from './components';
import { ReportWrapperDirective } from './directives';
import { HttpClientModule } from '@angular/common/http'
import { ChartsModule } from 'ng2-charts'
import { CommonModule } from '@angular/common';
@NgModule({
  declarations: [ChartJsComponent, DashletComponent, ReportWrapperDirective],
  imports: [HttpClientModule, ChartsModule, CommonModule],
  exports: [DashletComponent],
  entryComponents: [ChartJsComponent]
})
export class DashletModule { }
