interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Initializing your assistant..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-4">
        {/* HEOR Signal Logo */}
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <i className="fas fa-chart-line text-white text-xl"></i>
        </div>
        
        {/* App Name */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          HEOR Signal
        </h1>
        
        {/* Loading Message and Spinner */}
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-base">{message}</span>
        </div>
      </div>
    </div>
  );
}