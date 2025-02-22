interface GeocodingResult {
  address: string
  components: {
    country?: string
    state?: string
    city?: string
    district?: string
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: string = 'en'
): Promise<GeocodingResult | null> {
  try {
    // 根据用户语言选择地址语言
    const lang = language === 'zh' ? 'zh-CN' : 'en'
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&language=${lang}`
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn('No geocoding results found:', data)
      return null
    }

    // 获取最详细的地址结果
    const result = data.results[0]
    
    // 解析地址组件
    const components: GeocodingResult['components'] = {}
    for (const component of result.address_components) {
      if (component.types.includes('country')) {
        components.country = component.long_name
      } else if (component.types.includes('administrative_area_level_1')) {
        components.state = component.long_name
      } else if (component.types.includes('locality')) {
        components.city = component.long_name
      } else if (component.types.includes('sublocality')) {
        components.district = component.long_name
      }
    }

    // 移除 Plus Code
    const cleanAddress = (address: string) => {
      // 匹配 Plus Code 格式（例如：M9G8+W6、8Q7X+6F 等）
      return address.replace(/^[A-Z0-9]{4,6}\+[A-Z0-9]{2,3}[,\s]+/, '')
    }

    return {
      address: cleanAddress(result.formatted_address),
      components,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
} 