import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';

@Pipe({ name: 'localizedField' })
export class LocalizedFieldPipe implements PipeTransform {
  constructor(private translocoService: TranslocoService) {}

  transform(value: any, field: string): string {
    const lang = this.translocoService.getActiveLang();
    return value[`${field}_${lang === 'ar' ? 'Ar' : 'En'}`] || '';
  }
}