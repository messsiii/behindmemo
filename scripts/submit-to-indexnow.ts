// Script to submit all pages to IndexNow
async function submitToIndexNow() {
  try {
    console.log('Submitting pages to IndexNow...')
    
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.behindmemory.com' 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/indexnow`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to submit: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('✓ Success:', result.message)
    
    if (result.urls) {
      console.log('\nSubmitted URLs:')
      result.urls.forEach((url: string, index: number) => {
        console.log(`${index + 1}. ${url}`)
      })
    }
    
  } catch (error) {
    console.error('✗ Error submitting to IndexNow:', error)
    process.exit(1)
  }
}

// Run the script
submitToIndexNow()