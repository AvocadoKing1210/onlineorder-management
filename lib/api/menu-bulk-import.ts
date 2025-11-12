'use client'

/**
 * Bulk import menu items from images using Cloudflare AI menu processing
 */

export interface ExtractedMenuItem {
  id?: string
  name: string
  description?: string
  price: string
  category?: string
  section?: string
}

export interface MenuExtractionResult {
  items: ExtractedMenuItem[]
  categories?: string[]
  sections?: string[]
}

export interface BulkImportResponse {
  results?: Array<{
    image_index: number
    text: string
    json?: MenuExtractionResult
    parse_error?: string
    item_count?: number
  }>
  text?: string
  json?: MenuExtractionResult
  parse_error?: string
  item_count?: number
  total_items?: number
  model: string
  processed_at: string
}

/**
 * Test mode response - used for UI testing without API calls
 */
const TEST_MODE_RESPONSE: BulkImportResponse = {
  text: "{\"items\":[{\"id\":\"F1\",\"name\":\"Chabu Roll\",\"description\":\"salmon,smoke salmon,cream cheese, tobikio,avocado,spicy mayo\",\"price\":\"$8.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F2\",\"name\":\"Kpoto Roll\",\"description\":\"tuna & salmon, avocado, tempura bits, lettuce, eel sauce\",\"price\":\"$8.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F3\",\"name\":\"Kobe Roll\",\"description\":\"shrimp tempura, eel sauce\",\"price\":\"$8.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F4\",\"name\":\"Nagoyaka Roll\",\"description\":\"spicy crab, mango, cucumber, tempura bits, lettuce, eel sauce\",\"price\":\"$9.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F5\",\"name\":\"Cinza Roll\",\"description\":\"snow crab, tempura shrimp, cucumber, avocado, lettuce, eel sauce\",\"price\":\"$10.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F6\",\"name\":\"Akasaka Roll\",\"description\":\"spiky scallop, avocado, tobiko, tempura bits, lettuce, eel sauce\",\"price\":\"$10.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F7\",\"name\":\"Yokohama Roll\",\"description\":\"lobster, crab stick, cucumber, tobiko, lettuce, mayo, eel sauce\",\"price\":\"$8.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"F8\",\"name\":\"Saitama Veggies Roll\",\"description\":\"sweet potato tempura, tofu, avocado, cucumber, lettuce\",\"price\":\"$8.99\",\"category\":\"FUTOMAKI\",\"section\":\"FUTOMAKI\"},{\"id\":\"U1\",\"name\":\"California\",\"description\":\"crab meat, avocado, cucumber, roll\",\"price\":\"$6.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U2\",\"name\":\"Tempura Shrimp/Cucumber Roll\",\"description\":\"Tempura Shrimp/Cucumber roll\",\"price\":\"$7.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U3\",\"name\":\"Tempura Shrimp/Avocado\",\"description\":\"Tempura Shrimp/Avocado\",\"price\":\"$7.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U4\",\"name\":\"Tempura Shrimp/Mango\",\"description\":\"Tempura Shrimp/Mango\",\"price\":\"$7.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U5\",\"name\":\"Mango/Crab Meat\",\"description\":\"Mango/Crab Meat\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U6\",\"name\":\"Salmon /Avocado\",\"description\":\"Salmon /Avocado\",\"price\":\"$7.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U7\",\"name\":\"Salmon Roll\",\"description\":\"(seaweed outside)\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U8\",\"name\":\"Tuna Roll\",\"description\":\"(seaweed outside)\",\"price\":\"$6.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U9\",\"name\":\"Sweet Potato Tempura\",\"description\":\"outside\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U10\",\"name\":\"Avocado\",\"description\":\"Cucumber\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U11\",\"name\":\"Cucumber\",\"description\":\"U11. Cucumber\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U12\",\"name\":\"Avocado/Cucumber\",\"description\":\"U12. Avocado/Cucumber\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U13\",\"name\":\"Crispy Mango\",\"description\":\"U13. Crispy Mango\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U14\",\"name\":\"Spicy Crispy Salmon\",\"description\":\"U14. Spicy Crispy Salmon\",\"price\":\"$6.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U15\",\"name\":\"Spicy Crab Meat\",\"description\":\"U15. Spicy Crab Meat\",\"price\":\"$6.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U16\",\"name\":\"Spicy Crispy Tuna\",\"description\":\"U16. Spicy Crispy Tuna\",\"price\":\"$7.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U17\",\"name\":\"Spicy Crispy Scallop\",\"description\":\"U17. Spicy Crispy Scallop\",\"price\":\"$8.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U18\",\"name\":\"Spicy Crispy Snow Crab\",\"description\":\"U18. Spicy Crispy Snow Crab\",\"price\":\"$8.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U19\",\"name\":\"Spicy Crispy Avocado\",\"description\":\"U19. Spicy Crispy Avocado\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U20\",\"name\":\"Spicy Crispy Cucumber\",\"description\":\"U20. Spicy Crispy Cucumber\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U21\",\"name\":\"Spicy Crispy Vegetable\",\"description\":\"U21. Spicy Crispy Vegetable\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U22\",\"name\":\"Yam Avocado Roll\",\"description\":\"U22. Yam Avocado Roll\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U23\",\"name\":\"Yam Avocado Roll\",\"description\":\"U23. Yam Avocado Roll\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"U24\",\"name\":\"Mango Avocado Roll\",\"description\":\"U24. Mango Avocado Roll\",\"price\":\"$5.99\",\"category\":\"UNA MAKI\",\"section\":\"UNA MAKI\"},{\"id\":\"R1\",\"name\":\"House Eki Roll\",\"description\":\"smoked salmon, tempura shrimp, avocado, cream cheese roll topped with spicy tuna & crispy bits\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R2\",\"name\":\"Tiger Stripe Roll\",\"description\":\"b.b.a. eel, shrimp, tuna,avocado on the top of tempura shrimp, cucumber, crab meat roll, eel sauce\",\"price\":\"$8.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R3\",\"name\":\"Dynamite Roll\",\"description\":\"salmon, crab meat, avocado, cucumber, spicy mayo roll topped with fish eggs &spicy crispy bits\",\"price\":\"$8.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R4\",\"name\":\"Spider Roll\",\"description\":\"deep fry soft shell crab, crab meat, cucumber, avocado, mayo, roll top with fish eggs, eel sauce\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R5\",\"name\":\"Eel Special Roll\",\"description\":\"crab meat, egg omelette, avocado, cucumber roll topped w/ b.b.a., eel, sesame seed & eel sauce\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R6\",\"name\":\"Red Dragon Roll\",\"description\":\"tempura shrimp, cucumber, avocado, mayo roll topped with salmon sashimi & tobiko, eel sauce\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R7\",\"name\":\"Rainbow Roll\",\"description\":\"crab meat, avocado, cucumber, mango roll topped with salmon, napper, tuna, avocado, tobiko, eel sauce\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R8\",\"name\":\"Philadelphia Roll\",\"description\":\"smoked salmon on the top of crab meat, avocado, salmon, cream cheese roll with crispy bits\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R9\",\"name\":\"Green Dragon Roll\",\"description\":\"avocado topped with tempura shrimp, crab stick, cucumber, mango roll, yummy sauce\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"},{\"id\":\"R10\",\"name\":\"Golden Chicken Roll\",\"description\":\"sweet potato tempura sliced on the top of teriyaki chicken, mango\",\"price\":\"$9.99\",\"category\":\"SIGNATURE ROLL\",\"section\":\"SIGNATURE ROLL\"}]}",
  json: null,
  parse_error: "Expected ',' or ']' after array element in JSON at position 6561 (line 1 column 6562)",
  model: "@cf/meta/llama-3.2-11b-vision-instruct",
  processed_at: new Date().toISOString(),
}

/**
 * Process menu images using Cloudflare AI menu processing service
 * @param images Array of image files to process
 * @returns Extraction results with parsed menu items
 */
export async function processMenuImages(
  images: File[]
): Promise<BulkImportResponse> {
  // Test mode: Return hardcoded response for UI testing
  // Set NEXT_PUBLIC_MENU_BULK_IMPORT_TEST_MODE=true to enable, or leave unset to use real API
  const testMode = process.env.NEXT_PUBLIC_MENU_BULK_IMPORT_TEST_MODE !== 'false'
  
  if (testMode) {
    console.log('🧪 TEST MODE: Using hardcoded response instead of API call')
    console.log('   To disable test mode, set NEXT_PUBLIC_MENU_BULK_IMPORT_TEST_MODE=false')
    // Simulate a small delay to mimic API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    return TEST_MODE_RESPONSE
  }

  const menuProcUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_MENU_PROC_URL

  if (!menuProcUrl) {
    throw new Error('NEXT_PUBLIC_CLOUDFLARE_MENU_PROC_URL is not configured')
  }

  const formData = new FormData()

  // Add all images to form data
  if (images.length === 1) {
    formData.append('image', images[0])
  } else {
    images.forEach((image) => {
      formData.append('images', image)
    })
  }

  const response = await fetch(menuProcUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Menu processing API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(
      `Failed to process menu images: ${response.status} ${errorText}`
    )
  }

  const data: BulkImportResponse = await response.json()
  console.log('Menu processing API response:', {
    hasResults: !!data.results,
    resultsCount: data.results?.length,
    hasJson: !!data.json,
    itemCount: data.json?.items?.length || data.item_count,
    totalItems: data.total_items,
    parseError: data.parse_error,
    textPreview: data.text?.substring(0, 200)
  })
  return data
}

/**
 * Process menu images from URLs using Cloudflare AI menu processing service
 * @param imageUrls Array of image URLs to process
 * @returns Extraction results with parsed menu items
 */
export async function processMenuImageUrls(
  imageUrls: string[]
): Promise<BulkImportResponse> {
  const menuProcUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_MENU_PROC_URL

  if (!menuProcUrl) {
    throw new Error('NEXT_PUBLIC_CLOUDFLARE_MENU_PROC_URL is not configured')
  }

  const body: { images?: string[]; image_url?: string } = {}

  if (imageUrls.length === 1) {
    body.image_url = imageUrls[0]
  } else {
    body.images = imageUrls
  }

  const response = await fetch(menuProcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to process menu images: ${response.status} ${errorText}`
    )
  }

  const data: BulkImportResponse = await response.json()
  return data
}

