import React from 'react';
import parse from 'html-react-parser';

export default function SectionWithHtmlCode(props) {
  const { embedObject } = props;
  if (embedObject.html_code_alignment === 'Left') {
    return (
      <div className='contact-page-section max-width'>
        <div className='contact-page-content'>
          {embedObject.title && <h1 {...embedObject.$?.title}>{embedObject.title}</h1>}
          <div {...embedObject.$?.description}>{embedObject.description && parse(embedObject.description)}</div>
        </div>
        <div className='contact-page-form' {...embedObject.$?.html_code}>
          {embedObject.html_code && parse(embedObject.html_code)}
        </div>
      </div>
    );
  }
  return (
    <div className='contact-maps-section max-width'>
      <div className='maps-details' {...embedObject.$?.html_code}>
        {parse(embedObject.html_code)}
      </div>
      <div className='contact-maps-content'>
        {embedObject.title ? <h2 {...embedObject.$?.title}>{embedObject.title}</h2> : ''}
        <div {...embedObject.$?.description}> {embedObject.description && parse(embedObject.description)}</div>
      </div>
    </div>
  );
}
