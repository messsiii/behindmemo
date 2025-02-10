
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-screen flex flex-col items-center justify-center py-10">
          <div className="w-full max-w-4xl space-y-12">
            {/* 标题占位 */}
            <div className="h-16 w-96 mx-auto bg-white/5 rounded-lg animate-pulse" />
            
            {/* 图片占位 */}
            <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-white/5 animate-pulse" />
            
            {/* 内容占位 */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10 space-y-4">
                  {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-6 bg-white/5 rounded animate-pulse" style={{
                  width: `${Math.random() * 30 + 70}%`
                }} />
                  ))}
                </div>
              </div>
          </div>
      </div>
    </div>
  )
}
