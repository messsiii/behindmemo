import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 p-4">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="relative h-[300px] md:h-[600px] md:w-1/2 bg-gray-200 animate-pulse" />
            <CardContent className="p-8 md:w-1/2">
              <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}

