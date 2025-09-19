"use client";

import { useState, useRef } from "react";

interface CropResult {
  originalFilename: string;
  croppedFilename: string;
  analysis: {
    title: string;
    effection: string;
  };
  crop_params: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  processing_time: number;
}

export default function AICropPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropResult, setCropResult] = useState<CropResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage("");
    }, 5000);
  };

  const hideError = () => {
    setErrorMessage("");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        if (file.size > 50 * 1024 * 1024) {
          showError("图片大小不能超过50MB");
          return;
        }
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setCropResult(null);
        hideError();
      } else {
        showError("请选择图片文件");
      }
    }
  };

  const handleCropImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/crop", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI裁剪处理失败");
      }

      const result = await response.json();
      setCropResult(result);
    } catch (error) {
      console.error("AI裁剪错误:", error);
      showError("处理失败: AI裁剪服务暂时不可用，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/download/${filename}`);
      if (!response.ok) throw new Error("下载失败");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      showError("下载失败: 无法下载文件，请稍后重试");
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setCropResult(null);
    hideError();
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: 'var(--bg-color)',
      color: 'var(--text-primary)',
      lineHeight: 1.6,
      minHeight: '100vh'
    }}>
      <style jsx global>{`
        :root {
          --primary-color: #667eea;
          --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --secondary-color: #f093fb;
          --success-color: #4ade80;
          --error-color: #f87171;
          --warning-color: #fbbf24;
          --bg-color: #f8fafc;
          --card-bg: #ffffff;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border-color: #e2e8f0;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --border-radius: 12px;
        }

        /* Header */
        .header {
          background: var(--card-bg);
          padding: 1rem 0;
          box-shadow: var(--shadow-sm);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 700;
          font-size: 1.5rem;
          background: var(--primary-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .logo::before {
          content: '✨';
          font-size: 1.75rem;
        }

        .beta-tag {
          background: var(--primary-color);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Main Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        /* Main App Card */
        .app-card {
          background: var(--card-bg);
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .app-header {
          background: var(--primary-gradient);
          color: white;
          padding: 1.5rem;
          text-align: center;
        }

        .app-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .app-header p {
          opacity: 0.9;
          font-size: 0.875rem;
        }

        .app-body {
          padding: 2rem;
        }

        /* Error States */
        .error-message {
          background: var(--error-color);
          color: white;
          padding: 1rem;
          border-radius: var(--border-radius);
          margin-bottom: 1rem;
        }

        /* Upload Area */
        .upload-area {
          border: 2px dashed var(--border-color);
          border-radius: var(--border-radius);
          padding: 3rem 2rem;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
          margin-bottom: 2rem;
        }

        .upload-area:hover {
          border-color: var(--primary-color);
          background: rgba(102, 126, 234, 0.05);
        }

        .upload-area.dragover {
          border-color: var(--primary-color);
          background: rgba(102, 126, 234, 0.1);
        }

        .upload-icon {
          width: 4rem;
          height: 4rem;
          margin: 0 auto 1rem;
          background: var(--primary-gradient);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: white;
        }

        .upload-text h3 {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .upload-text p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .file-input {
          display: none;
        }

        .upload-button {
          background: var(--primary-gradient);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--border-radius);
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .upload-button:hover {
          transform: translateY(-1px);
        }

        /* Processing State */
        .processing-area {
          text-align: center;
          padding: 3rem 2rem;
        }

        .processing-spinner {
          width: 3rem;
          height: 3rem;
          margin: 0 auto 1rem;
          border: 3px solid var(--border-color);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Results Area */
        .results-area {
          /* display controlled by state */
        }

        .results-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .image-container {
          position: relative;
          border-radius: var(--border-radius);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .image-container img {
          width: 100%;
          height: auto;
          display: block;
        }

        .image-label {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* AI Analysis */
        .ai-analysis {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 1.5rem;
          border-radius: var(--border-radius);
          margin-bottom: 2rem;
        }

        .ai-analysis h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .ai-analysis h3::before {
          content: '🤖';
        }

        .analysis-item {
          margin-bottom: 1rem;
        }

        .analysis-item:last-child {
          margin-bottom: 0;
        }

        .analysis-label {
          font-weight: 500;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }

        .analysis-content {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: var(--border-radius);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: var(--primary-gradient);
          color: white;
        }

        .btn-secondary {
          background: var(--card-bg);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .results-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .container {
            padding: 1rem;
          }

          .app-body {
            padding: 1rem;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-content">
          <div className="logo">
            AI裁剪工具
          </div>
          <span className="beta-tag">v1.1</span>
        </div>
      </header>

      <main className="container">
        <div className="app-card">
          <div className="app-header">
            <h2>开始裁剪你的照片</h2>
            <p>支持 JPEG、PNG、GIF、WebP 格式，最大 50MB</p>
          </div>

          <div className="app-body">
            {errorMessage && (
              <div className="error-message" id="errorMessage">
                {errorMessage}
              </div>
            )}

            {/* Upload Area */}
            {!previewUrl && !cropResult && (
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const file = files[0];
                    if (file && file.type.startsWith('image/')) {
                      if (file.size > 50 * 1024 * 1024) {
                        showError("图片大小不能超过50MB");
                        return;
                      }
                      setSelectedFile(file);
                      const url = URL.createObjectURL(file);
                      setPreviewUrl(url);
                      setCropResult(null);
                      hideError();
                      // Auto-trigger cropping after upload
                      setTimeout(() => {
                        handleCropImage();
                      }, 500);
                    } else {
                      showError('请选择图片文件');
                    }
                  }
                }}
              >
                <div className="upload-icon">📸</div>
                <div className="upload-text">
                  <h3>拖拽图片到这里，或点击上传</h3>
                  <p>支持 JPG、PNG、GIF、WebP 格式</p>
                  <button className="upload-button">
                    选择图片
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="file-input"
                  accept="image/*"
                  onChange={(e) => {
                    handleFileSelect(e);
                    // Auto-trigger cropping after file selection
                    if (e.target.files?.[0]) {
                      setTimeout(() => {
                        handleCropImage();
                      }, 500);
                    }
                  }}
                />
              </div>
            )}

            {/* Processing Area */}
            {isProcessing && (
              <div className="processing-area">
                <div className="processing-spinner"></div>
                <h3>AI正在分析你的照片...</h3>
                <p>这可能需要几秒钟时间，请耐心等待</p>
              </div>
            )}

            {/* Results Area */}
            {cropResult && (
              <div className="results-area">
                <div className="results-grid">
                  <div className="image-container">
                    <img src={previewUrl} alt="原图" />
                    <div className="image-label">原图</div>
                  </div>
                  <div className="image-container">
                    <img src={`/api/download/${cropResult.croppedFilename}`} alt="裁剪后" />
                    <div className="image-label">AI推荐</div>
                  </div>
                </div>

                <div className="ai-analysis">
                  <h3>AI分析结果</h3>
                  <div className="analysis-item">
                    <div className="analysis-label">推荐方案</div>
                    <div className="analysis-content">{cropResult.analysis.title}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">效果说明</div>
                    <div className="analysis-content">{cropResult.analysis.effection}</div>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => handleDownload(cropResult.croppedFilename)}>
                    💾 下载裁剪图片
                  </button>
                  <button className="btn btn-secondary" onClick={resetApp}>
                    🔄 重新上传
                  </button>
                  <button className="btn btn-secondary" onClick={() => {}}>
                    📤 分享结果
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}