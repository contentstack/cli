import React, { useState, useEffect } from 'react';
import ReactJson from 'react-json-view';
import Tooltip from '../components/too-tip';

function filterObject(inputObject) {
  const unWantedProps = ['uid', '_version', 'ACL', '_in_progress', 'created_at', 'created_by', 'updated_at', 'updated_by', 'publish_details'];
  for (const key in inputObject) {
    unWantedProps.includes(key) && delete inputObject[key];
    if (typeof inputObject[key] !== 'object') {
      continue;
    }
    inputObject[key] = filterObject(inputObject[key]);
  }
  return inputObject;
}
const DevTools = ({ response }) => {
  const filteredJson = filterObject(response);
  const [forceUpdate, setForceUpdate] = useState(0);

  function copyObject(object) {
    navigator.clipboard.writeText(object);
    setForceUpdate(1);
  }

  useEffect(() => {
    if (forceUpdate !== 0) {
      setTimeout(() => setForceUpdate(0), 300);
    }
  }, [forceUpdate]);

  return (
    <div className='modal fade' id='staticBackdrop' data-bs-backdrop='static' data-bs-keyboard='false' tabIndex='-1' aria-labelledby='staticBackdropLabel' aria-hidden='true'>
      <div className='modal-dialog .modal-lg modal-dialog-centered modal-dialog-scrollable'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h2 className='modal-title' id='staticBackdropLabel'>
              JSON Preview
            </h2>
            <span className='json-copy' onClick={() => copyObject(JSON.stringify(filteredJson))} aria-hidden='true'>
              <Tooltip content={forceUpdate === 0 ? 'Copy' : 'Copied'} direction='top' delay={200} dynamic status={forceUpdate}>
                <img src='/copy.svg' alt='copy icon' />
              </Tooltip>
            </span>
            <button type='button' className='btn-close' data-bs-dismiss='modal' aria-label='Close'></button>
          </div>
          <div className='modal-body'>
            <pre id='jsonViewer'>{filteredJson && <ReactJson src={filteredJson} collapsed={1} name='response' enableClipboard={false} />}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DevTools;
