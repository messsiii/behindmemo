#!/usr/bin/env node

const https = require('https')

// IndexNow configuration
const INDEXNOW_KEY = 'a1b2c3d4e5f6789012345678901234567'
const HOST = 'www.behindmemory.com'

// List of URLs to submit (from sitemap)
const urls = [
  'https://www.behindmemory.com',
  'https://www.behindmemory.com/write',
  'https://www.behindmemory.com/flux-kontext-pro',
  'https://www.behindmemory.com/flux-kontext-max',
  'https://www.behindmemory.com/gemini-2.5-flash-image',
  'https://www.behindmemory.com/pricing',
  'https://www.behindmemory.com/blog',
  'https://www.behindmemory.com/about',
  'https://www.behindmemory.com/terms',
  'https://www.behindmemory.com/privacy',
  'https://www.behindmemory.com/blog/how-to-write-heartfelt-letter-even-not-writer',
  'https://www.behindmemory.com/blog/share-your-heart-before-its-too-late',
]

// Submit to multiple IndexNow endpoints for better coverage
const endpoints = [
  { hostname: 'api.indexnow.org', name: 'IndexNow' },
  { hostname: 'www.bing.com', name: 'Bing' },
  { hostname: 'search.seznam.cz', name: 'Seznam' },
  { hostname: 'yandex.com', name: 'Yandex' },
]

function submitToEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      urlList: urls,
    })

    const options = {
      hostname: endpoint.hostname,
      port: 443,
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }

    console.log(`\nSubmitting to ${endpoint.name}...`)

    const req = https.request(options, res => {
      let responseData = ''

      res.on('data', chunk => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 202) {
          console.log(`✓ ${endpoint.name}: Success (Status: ${res.statusCode})`)
          resolve({ endpoint: endpoint.name, success: true, status: res.statusCode })
        } else {
          console.log(`⚠ ${endpoint.name}: Status ${res.statusCode}`)
          if (responseData) {
            console.log(`  Response: ${responseData}`)
          }
          resolve({
            endpoint: endpoint.name,
            success: false,
            status: res.statusCode,
            response: responseData,
          })
        }
      })
    })

    req.on('error', error => {
      console.error(`✗ ${endpoint.name}: Error - ${error.message}`)
      resolve({ endpoint: endpoint.name, success: false, error: error.message })
    })

    req.write(data)
    req.end()
  })
}

async function submitAllPages() {
  console.log('=== IndexNow Submission Tool ===')
  console.log(`Host: ${HOST}`)
  console.log(`URLs to submit: ${urls.length}`)
  console.log('\nURLs:')
  urls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`)
  })

  console.log('\n=== Submitting to search engines ===')

  const results = await Promise.all(endpoints.map(endpoint => submitToEndpoint(endpoint)))

  console.log('\n=== Summary ===')
  const successCount = results.filter(r => r.success).length
  console.log(`Successful submissions: ${successCount}/${endpoints.length}`)

  if (successCount > 0) {
    console.log('\n✓ Pages have been submitted to search engines!')
    console.log('Note: It may take a few days for search engines to process the submissions.')
  } else {
    console.log('\n⚠ No successful submissions. Please check your configuration.')
  }
}

// Run the submission
submitAllPages().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
