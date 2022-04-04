import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ArchiveRelative from '../components/archive-relative';
import RenderComponents from '../components/render-components';
import { onEntryChange } from '../sdk/entry';
import BlogList from '../components/blog-list';
import { getBlogListRes, getPageRes } from '../helper';
import Skeleton from 'react-loading-skeleton';

export default function Blog({ entry }) {
  const history = useNavigate();
  const [getEntry, setEntry] = useState(null);
  const [getList, setList] = useState({ archive: [], list: [] });
  const [error, setError] = useState(false);

  async function fetchData() {
    try {
      const blog = await getPageRes('/blog');
      const result = await getBlogListRes();
      (!blog || !result) && setError(true);

      const archive = [];
      const blogLists = [];

      result.forEach((blogs) => {
        if (blogs.is_archived) {
          archive.push(blogs);
        } else {
          blogLists.push(blogs);
        }
      });
      setEntry(blog);
      setList({ archive: archive, list: blogLists });
      entry({ page: blog, blogPost: result });
    } catch (error) {
      console.error(error);
      setError(true);
    }
  }

  useEffect(() => {
    onEntryChange(() => fetchData());
  }, []);

  useEffect(() => {
    error && history('/404');
  }, [error]);
  return (
    <>
      {getEntry ? (
        <RenderComponents
          pageComponents={getEntry.page_components}
          blogsPage
          contentTypeUid='page'
          entryUid={getEntry.uid}
          locale={getEntry.locale}
        />
      ):<Skeleton height={400} />}
      <div className='blog-container'>
        <div className='blog-column-left'>
          {Object.keys(getList.list).length? getList.list.map((bloglist, index) => (
            <BlogList bloglist={bloglist} key={index} />
          )):<Skeleton height={400} width={400} count={3} />}
        </div>
        <div className='blog-column-right'>
          {getEntry && getEntry.page_components[1].widget && (
            <h2>{getEntry.page_components[1].widget.title_h2}</h2>
          )}
          {Object.keys(getList.archive).length ? (
            <ArchiveRelative blogs={getList.archive} />
          ): <Skeleton height={600} width={300} />}
        </div>
      </div>
    </>
  );
}
