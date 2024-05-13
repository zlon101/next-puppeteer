'use client';

import Image from 'next/image';
import {useEffect} from 'react';
import {logIcon} from '@/lib/tool';
import styles from './page.module.css';

export default function Home() {
  useEffect(() => {
    console.debug('useEffect !!!');
    fetch('/api')
      .then(response => response.json())
      .then(data => {
        logIcon('搜索列表', data);
      });
  }, []);

  return (
    <main className={styles.main}>
      <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer">
        By <Image src="/next.svg" alt="Vercel Logo" className={styles.vercelLogo} width={100} height={24} priority />
      </a>
    </main>
  );
}

/**
 
// Example POST method implementation:
async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

postData("https://example.com/answer", { answer: 42 }).then((data) => {
  console.log(data); // JSON data parsed by `data.json()` call
});

 * **/
