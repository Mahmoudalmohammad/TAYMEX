'use client';
import { useState } from 'react';
import {
  Alert, Button, CheckboxField, DataTable, FileUploadField, ModalDialog, Pagination,
  PasswordField, RadioGroupField, SearchField, SelectField, Skeleton, SwitchField,
  Tabs, TextField, Toast
} from '@engineering-platform/ui';
import { DataToolbar, FormPage, FormSection, PageState } from '@engineering-platform/ui-patterns';
import type { UiFormatExamples } from '../i18n/formatting';
import type { UiReferenceCopy } from '../i18n/ui-reference-messages';

type Row={id:string;name:string;status:string;amount:string};
export function F8ReferenceSurface({copy,formats}:{copy:UiReferenceCopy;formats:UiFormatExamples}) {
  const [theme,setTheme]=useState<'light'|'dark'>('light');
  const rows:Row[]=[
    {id:'r1',name:'TAYMEX 01',status:copy.statusActive,amount:formats.currency},
    {id:'r2',name:'Solar 5 kW',status:copy.statusDraft,amount:formats.number},
  ];
  const setDocumentTheme=(value:'light'|'dark')=>{setTheme(value);document.documentElement.dataset.theme=value;};
  return <div data-f8-reference>
    <FormPage
      title={copy.pageTitle}
      description={copy.pageDescription}
      status={<Alert tone="info" title={copy.introTitle}>{copy.introBody}</Alert>}
      actions={<div data-taymex-action-row>
        <Button data-f8-theme="light" variant={theme==='light'?'primary':'secondary'} onPress={()=>setDocumentTheme('light')}>{copy.themeLight}</Button>
        <Button data-f8-theme="dark" variant={theme==='dark'?'primary':'secondary'} onPress={()=>setDocumentTheme('dark')}>{copy.themeDark}</Button>
      </div>}
    >
      <FormSection id="f8-profile" title={copy.formTitle} description={copy.formDescription}>
        <TextField label={copy.name} placeholder={copy.namePlaceholder}/>
        <TextField label={copy.email} type="email" status="success" statusMessage={copy.emailStatus} defaultValue="user@example.com"/>
        <PasswordField label={copy.password} showLabel={copy.showPassword} hideLabel={copy.hidePassword} description={copy.passwordHint} autoComplete="new-password"/>
        <SelectField label={copy.language} defaultValue="ar" options={[{id:'ar',label:copy.languageAr},{id:'tr',label:copy.languageTr},{id:'en',label:copy.languageEn}]}/>
        <RadioGroupField label={copy.role} description={copy.roleDescription} defaultValue="editor" options={[{id:'admin',label:copy.roleAdmin},{id:'editor',label:copy.roleEditor},{id:'viewer',label:copy.roleViewer}]}/>
        <CheckboxField label={copy.consent} defaultSelected/>
        <SwitchField label={copy.notifications} defaultSelected/>
        <FileUploadField label={copy.upload} description={copy.uploadDescription} chooseLabel={copy.chooseFile} emptyLabel={copy.noFile} acceptedFileTypes={['image/png','image/jpeg']}/>
        <div data-taymex-action-row>
          <Button isLoading loadingLabel={copy.saving}>{copy.save}</Button>
          <Button variant="secondary" isDisabled>{copy.disabledAction}</Button>
        </div>
      </FormSection>
    </FormPage>

    <section data-taymex-reference-section aria-labelledby="f8-data-heading">
      <h2 id="f8-data-heading">{copy.dataTitle}</h2>
      <DataToolbar search={<SearchField label={copy.search} placeholder={copy.search} clearLabel={copy.clearSearch}/>} actions={<Button variant="secondary">{copy.save}</Button>}/>
      <DataTable<Row> label={copy.tableLabel} rows={rows} getRowId={row=>row.id} density="default" columns={[
        {id:'name',header:copy.colName,isRowHeader:true,cell:row=>row.name},
        {id:'status',header:copy.colStatus,cell:row=>row.status},
        {id:'amount',header:copy.colAmount,align:'numeric',cell:row=>row.amount},
      ]}/>
      <Pagination page={1} pageCount={3} label={copy.pagination} previousLabel={copy.previous} nextLabel={copy.next} pageLabel={copy.pageOf}/>
    </section>

    <section data-taymex-reference-section aria-labelledby="f8-feedback-heading">
      <h2 id="f8-feedback-heading">{copy.feedbackTitle}</h2>
      <Alert tone="success" title={copy.successTitle}>{copy.successBody}</Alert>
      <Toast tone="success" title={copy.toastTitle}>{copy.toastBody}</Toast>
      <ModalDialog trigger={<Button variant="secondary">{copy.modalOpen}</Button>} title={copy.modalTitle} closeLabel={copy.modalClose}>{copy.modalBody}</ModalDialog>
      <Tabs label={copy.tabsLabel} items={[
        {id:'empty',label:copy.emptyTab,content:<PageState kind="empty" title={copy.emptyTitle} description={copy.emptyBody}/>},
        {id:'loading',label:copy.loadingTab,content:<Skeleton label={copy.loadingLabel} lines={4}/>},
      ]}/>
    </section>

    <section data-taymex-reference-section aria-labelledby="f8-format-heading">
      <h2 id="f8-format-heading">{copy.formattingTitle}</h2>
      <dl data-taymex-format-grid>
        <div><dt>{copy.numberLabel}</dt><dd data-f8-format-number>{formats.number}</dd></div>
        <div><dt>{copy.currencyLabel}</dt><dd data-f8-format-currency>{formats.currency}</dd></div>
        <div><dt>{copy.dateLabel}</dt><dd data-f8-format-date>{formats.date}</dd></div>
        <div><dt>{copy.unitLabel}</dt><dd data-f8-format-unit>{formats.unit}</dd></div>
        <div><dt>{copy.mixedLabel}</dt><dd data-f8-mixed dir="auto">{copy.mixedValue}</dd></div>
      </dl>
    </section>
  </div>;
}
