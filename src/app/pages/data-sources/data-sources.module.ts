import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { DataSourcesPage } from './data-sources.page';

const routes: Routes = [
  {
    path: '',
    component: DataSourcesPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    DataSourcesPage
  ]
})
export class DataSourcesPageModule {}
