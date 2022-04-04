import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './header';
import Footer from './footer';
import DevTools from './devtools';
import { getHeaderRes, getFooterRes, getAllEntries } from '../helper';
import { onEntryChange } from '../sdk/entry';

export default function Layout({ entry }) {
  const history = useNavigate();
  const [getLayout, setLayout] = useState({
    header: {},
    footer: {},
    navHeaderList: [],
    navFooterList: [],
  });
  const mergeObjs = (...objs) => Object.assign({}, ...objs);
  const jsonObj = mergeObjs(
    { header: getLayout.header },
    { footer: getLayout.footer },
    entry
  );

  const [error, setError] = useState(false);

  async function fetchData() {
    try {
      const header = await getHeaderRes();
      const footer = await getFooterRes();
      const allEntry = await getAllEntries();
      !header || (!footer && setError(true));
      let navHeaderList = header.navigation_menu;
      let navFooterList = footer.navigation.link;
      if (allEntry.length !== header.navigation_menu.length) {
        allEntry.forEach((entry) => {
          const hFound = header.navigation_menu.find(
            (navLink) => navLink.label === entry.title
          );
          if (!hFound) {
            navHeaderList.push({
              label: entry.title,
              page_reference: [{ title: entry.title, url: entry.url }],
            });
          }
          const fFound = footer.navigation.link.find(
            (link) => link.title === entry.title
          );
          if (!fFound) {
            navFooterList.push({ title: entry.title, href: entry.url });
          }
        });
      }

      setLayout({
        header: header,
        footer: footer,
        navHeaderList,
        navFooterList,
      });
    } catch (error) {
      setError(true);
      console.error(error);
    }
  }

  useEffect(async () => {
    onEntryChange(fetchData);
  }, []);

  useEffect(() => {
    console.error('error...', error);
    error && history('/error');
  }, [error]);

  return (
    <div className='layout'>
      <Header header={getLayout.header} navMenu={getLayout.navHeaderList} />
      <DevTools response={jsonObj} />
      <Outlet />
      <Footer footer={getLayout.footer} navMenu={getLayout.navFooterList} />
    </div>
  );
}
