/* Shared mortgage details for both roster-based signature generators. */
(function (root) {
  'use strict';
  const COMPANY_NMLS = '894392';
  const WEBSITE = 'https://blueskyhomefinance.com/';
  const APPLICATION = 'https://blueskyhomefinance.com/loan-app/?siteId=8983717502&workFlowId=208215';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  function applicationUrl(value) {
    if (!value || !String(value).trim()) return APPLICATION;
    try {
      const url = new URL(String(value).trim());
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function enabled(checked, nmls) { return !!checked && /^\d+$/.test(String(nmls ?? '').trim()); }
  function licenses(nmls) { return 'NMLS #' + escape(nmls) + ' | Company NMLS #' + COMPANY_NMLS; }
  function links(checked, nmls, applyUrl) {
    if (!enabled(checked, nmls)) return '';
    const url = applicationUrl(applyUrl);
    return '<div style="margin-top:7px;font-size:12px;line-height:1.5"><a href="' + WEBSITE + '" style="color:#0e3764">Blue Sky Home Finance</a>' + (url ? ' &nbsp;|&nbsp; <a href="' + escape(url) + '" style="color:#0e3764;font-weight:700">Apply Now</a>' : '') + '</div>';
  }
  root.CLEMortgage = Object.freeze({COMPANY_NMLS, WEBSITE, APPLICATION, applicationUrl, enabled, licenses, links});
})(globalThis);
