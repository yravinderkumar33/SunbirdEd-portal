import { Component, ComponentFactoryResolver, Input, OnInit, ViewChild } from '@angular/core';
import { ReportWrapperDirective } from '../../directives';

import { ChartJsComponent } from '../chart-js/chart-js.component';


@Component({
  selector: 'sb-dashlet',
  templateUrl: './dashlet.component.html',
  styleUrls: ['./dashlet.component.css']
})
export class DashletComponent implements OnInit {

  @Input() type: string;
  @Input() config: object;
  @Input() data: object;

  @Input() width = '100%';
  @Input() height = '100%';

  constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

  private readonly _typeToComponentMapping = Object.freeze({
    'line': ChartJsComponent,
    'pie': ChartJsComponent,
    'bar': ChartJsComponent,
    'horizontalBar': ChartJsComponent,
    'bubble': ChartJsComponent,
    'doughnut': ChartJsComponent
  });

  @ViewChild(ReportWrapperDirective, { static: true }) reportWrapper: ReportWrapperDirective;

  ngOnInit(): void {
    if (!this.type || !this.config) {
      throw new Error('Syntax Error');
    }
    this.loadComponent(this.type);
  }

  loadComponent(type) {
    const component = this._typeToComponentMapping[type];
    if (!component) {
      throw new Error('type not supported');
    }
    this.reportWrapper.viewContainerRef.clear();
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory<{ initialize(config) }>(component);
    const componentRef = this.reportWrapper.viewContainerRef.createComponent(componentFactory);
    componentRef.instance.initialize({ config: this.config, type: this.type, data: this.data });
  }

}
