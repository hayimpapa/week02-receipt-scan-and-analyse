const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

const CATEGORIES = [
  'Groceries', 'Fruit & Veg', 'Meat & Seafood',
  'Deli & Bakery', 'Dairy & Eggs', 'Frozen Foods',
  'Snacks & Confectionery', 'Beverages', 'Alcohol',
  'Household & Cleaning', 'Health & Beauty',
  'Baby & Kids', 'Pet Supplies', 'Clothing',
  'Electronics', 'Dining Out', 'Fuel', 'Other',
];

export { CATEGORIES };

export async function extractReceiptData(base64Image, mimeType = 'image/jpeg') {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key is not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.');
  }

  const prompt = `You are a receipt data extraction assistant. Analyse this receipt image and extract the data into JSON format.

Extract the following:
- Merchant name
- Date of purchase (format: DD/MM/YYYY)
- Line items with: product name, quantity, unit price, total price, GST amount (0 if not shown)
- For each line item, suggest a category from this list: ${CATEGORIES.join(', ')}
- Receipt total
- Total GST
- Payment method (if visible, otherwise "Unknown")

Return ONLY valid JSON in this exact structure, with no other text:
{
  "merchant": "",
  "date": "",
  "paymentMethod": "",
  "receiptTotal": 0,
  "totalGST": 0,
  "items": [
    {
      "productName": "",
      "quantity": 0,
      "unitPrice": 0,
      "totalPrice": 0,
      "gst": 0,
      "suggestedCategory": ""
    }
  ]
}

Important:
- All prices should be numbers (not strings)
- If quantity is not clear, default to 1
- If unit price is not clear, use the total price
- GST amounts should be 0 if not explicitly shown on receipt
- Use the category list provided — pick the best match for each item`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.content.find((c) => c.type === 'text');

  if (!textContent) {
    throw new Error('No text response from Claude');
  }

  // Extract JSON from the response (handle potential markdown wrapping)
  let jsonStr = textContent.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  return parsed;
}
