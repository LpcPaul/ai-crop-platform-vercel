"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@saasfly/ui";
import { Button } from "@saasfly/ui/button";
import { Locale, localeMap } from "~/config/i18n-config";
import { LocaleChange } from "~/components/locale-change";
import { translateStaticTerms } from "~/utils/translate";

interface ClientIndexPageProps {
  dict: any;
  lang: Locale;
}

// Dot 组件用于底部切换指示器
interface DotProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function Dot({ active, onClick, label }: DotProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`h-3 w-3 rounded-full border transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B4A]/20 ${
        active
          ? "bg-[#FF6B4A] border-[#FF6B4A]"
          : "bg-white border-[#E7EAF0] hover:bg-[#FAFAFB]"
      }`}
    />
  );
}

export function ClientIndexPage({ dict, lang }: ClientIndexPageProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropResult, setCropResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOriginalLarge, setShowOriginalLarge] = useState<boolean>(false); // false=裁剪图大图, true=原图大图
  const touchStartX = useRef<number | null>(null);

  // 图片尺寸状态
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [croppedImageDimensions, setCroppedImageDimensions] = useState<{width: number, height: number} | null>(null);

  // Translation states
  const [translatedTitle, setTranslatedTitle] = useState<string>("");
  const [translatedDescription, setTranslatedDescription] = useState<string>("");

  // 切换视图大小
  const toggleViewSize = () => {
    setShowOriginalLarge(prev => !prev);
  };

  // 处理原图加载
  const handleOriginalImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setOriginalImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // 处理裁剪图加载
  const handleCroppedImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setCroppedImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // 获取动态容器样式
  const getContainerStyle = (dimensions: {width: number, height: number} | null, isLarge: boolean) => {
    if (!dimensions) {
      return {
        className: "aspect-[3/4]",
        style: {}
      };
    }

    const aspectRatio = dimensions.width / dimensions.height;

    if (isLarge) {
      // 大图模式：确保图片完整展示
      if (aspectRatio > 2) {
        // 超宽图片
        return {
          className: "",
          style: { aspectRatio: aspectRatio.toString(), maxHeight: '400px' }
        };
      } else if (aspectRatio < 0.5) {
        // 超高图片
        return {
          className: "",
          style: { aspectRatio: aspectRatio.toString(), maxHeight: '800px' }
        };
      } else {
        // 正常比例图片
        return {
          className: "",
          style: { aspectRatio: aspectRatio.toString(), maxHeight: '600px' }
        };
      }
    } else {
      // 小图模式：固定尺寸
      return {
        className: "aspect-[3/4]",
        style: {}
      };
    }
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
      e.preventDefault();
      toggleViewSize();
    }
  };

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // 触摸结束 - 检测左右轻扫
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    const swipeThreshold = 36; // 轻扫阈值

    if (Math.abs(dx) > swipeThreshold) {
      toggleViewSize();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      setSelectedFile(files[0]);
      setOriginalImageDimensions(null);
      setCroppedImageDimensions(null);
      setCropResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setOriginalImageDimensions(null);
      setCroppedImageDimensions(null);
      setCropResult(null);
    }
  };

  const handleCropAnalysis = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setCropResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('scene', 'instagram-post');
      formData.append('ratio', '1:1');
      formData.append('language', lang);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch('/api/crop/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'X-Crop-API-Version': '1',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'AI分析失败');
      }

      const result = await response.json();
      setCropResult(result);

      // Translate analysis content if not in Chinese
      if (result.analysis && lang !== 'zh') {
        const title = translateStaticTerms(result.analysis.title || '', lang);
        const description = translateStaticTerms(result.analysis.effection || '', lang);
        setTranslatedTitle(title);
        setTranslatedDescription(description);
      } else {
        setTranslatedTitle(result.analysis?.title || '');
        setTranslatedDescription(result.analysis?.effection || '');
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setError('请求超时，请稍后重试');
      } else {
        setError(error instanceof Error ? error.message : 'AI分析失败，请稍后重试');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCropProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('scene', 'instagram-post');
      formData.append('ratio', '1:1');
      formData.append('language', lang);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch('/api/crop', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'X-Crop-API-Version': '1',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '裁剪处理失败');
      }

      const result = await response.json();

      // Store the result for display
      setCropResult(result);

      // Translate analysis content if not in Chinese
      if (result.analysis && lang !== 'zh') {
        const title = translateStaticTerms(result.analysis.title || '', lang);
        const description = translateStaticTerms(result.analysis.effection || '', lang);
        setTranslatedTitle(title);
        setTranslatedDescription(description);
      } else {
        setTranslatedTitle(result.analysis?.title || '');
        setTranslatedDescription(result.analysis?.effection || '');
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setError('请求超时，请稍后重试');
      } else {
        setError(error instanceof Error ? error.message : '裁剪处理失败，请稍后重试');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b dark:bg-gray-900/80 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Site Name */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm0 12c-1.1 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SnapCrop</h1>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-3">
              {/* Language Selector */}
              <div className="relative">
                <select
                  value={lang}
                  onChange={(e) => {
                    const currentPath = window.location.pathname.replace(`/${lang}`, '');
                    window.location.href = `/${e.target.value}${currentPath}`;
                  }}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors cursor-pointer"
                >
                  {Object.entries(localeMap).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Auth buttons - Hidden for v1.0 launch */}
              {/*
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-600 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-300 font-medium"
                onClick={() => {
                  window.location.href = `/${lang}/login`;
                }}
              >
                {dict.marketing.login || "登录"}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md font-medium"
                onClick={() => {
                  window.location.href = `/${lang}/register`;
                }}
              >
                {dict.marketing.signup || "注册"}
              </Button>
              */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#111827] mb-4 dark:text-white">
            {dict.marketing.title}
          </h2>
          <p className="text-xl text-[#374151] mb-8 dark:text-gray-300">
            {dict.marketing.sub_title}
          </p>
        </div>

        {/* Upload Section - Hidden when showing results */}
        {!cropResult && (
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(16,24,40,0.06)] border border-[#E7EAF0] p-8 mb-8 dark:bg-[#0E1116] dark:border-gray-700">
          <h3 className="text-2xl font-semibold text-[#111827] mb-2 text-center dark:text-white">
            {dict.crop?.title || "AI智能裁剪"}
          </h3>
          <p className="text-[#374151] mb-6 text-center dark:text-gray-300">
            {dict.crop?.subtitle || "上传图片，使用AI技术进行智能裁剪，快速获得完美构图"}
          </p>

          {!selectedFile ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
                isDragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-[#E7EAF0] bg-[#FAFAFB] dark:border-gray-600 dark:bg-gray-800/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-[#374151] dark:text-gray-300">
                    {dict.crop?.upload_hint || "拖拽图片到这里或点击选择文件"}
                  </p>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
                    {dict.marketing.supported_formats}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {dict.crop?.select_image || "选择图片"}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-lg text-gray-700 dark:text-gray-300">
                      {dict.crop?.processing || "正在处理中..."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Selected"
                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto max-h-96"
                    />
                  </div>
                  <div className="flex justify-center space-x-4 flex-wrap">
                    <Button onClick={handleCropProcess} size="lg" className="bg-[#FF6B4A] hover:bg-[#E85E43] text-white shadow-md font-medium">
                      ✨ {dict.crop?.auto_crop || "AI自动裁剪"}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedFile(null);
                        setCropResult(null);
                        setError(null);
                      }}
                      variant="outline"
                      size="lg"
                      className="border-[#E7EAF0] text-[#374151] hover:bg-[#FAFAFB]"
                    >
                      {dict.crop?.reset || "重新选择"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Crop Result Display */}
        {cropResult && (
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(16,24,40,0.06)] border border-[#E7EAF0] p-8 dark:bg-[#0E1116] dark:border-gray-700">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-[#111827] dark:text-white">🎯 {dict.crop?.ai_analysis_results || "AI分析结果"}</h3>
              <p className="text-sm text-[#6B7280] mt-2 dark:text-gray-400">
                💡 {dict.crop?.view_mode_hint || "点击图片、轻扫或按键切换查看模式"}
              </p>
            </div>

            {/* AI裁剪方案显示 */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-[#FF6B4A] mb-3 dark:text-orange-300 flex items-center">
                <span className="mr-2">💡</span>
                {dict.crop?.ai_cropping_solution || "AI裁剪方案"}
              </h4>
              <div className="bg-[#FFF6EB] dark:bg-[#1C1712] rounded-lg p-4">
                {cropResult.analysis ? (
                  <div>
                    <p className="text-[#111827] dark:text-gray-200 font-medium mb-2">
                      {cropResult.analysis.title || dict.crop?.analysis_title_fallback || "AI智能裁剪方案"}
                    </p>
                    <p className="text-[#374151] dark:text-gray-300 text-base">
                      {cropResult.analysis.effection || dict.crop?.analysis_description_fallback || "AI正在分析图片的最佳裁剪方案..."}
                    </p>
                  </div>
                ) : (
                  <p className="text-[#374151] dark:text-gray-300 text-base">展示AI分析建议</p>
                )}
              </div>
            </div>

            {/* 构图对比：固定左右 + 大小切换 */}
            <div
              className="mb-8 w-full select-none"
              role="region"
              aria-label="构图查看器"
              onKeyDown={handleKeyDown}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              tabIndex={0}
            >
              {cropResult.output?.download_url && selectedFile ? (
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    {/* 左：原图（大小可切换） */}
                    <div
                      className={
                        "transition-all duration-300 ease-out " +
                        (showOriginalLarge ? "flex-1" : "flex-shrink-0 w-[200px]")
                      }
                    >
                      <div className="relative bg-[#F5F7FF] dark:bg-[#141926] rounded-xl border border-[#E7EAF0] shadow-sm p-4">
                        <div
                          className={
                            "group relative overflow-hidden rounded-lg bg-[#F5F7FF] dark:bg-[#141926] " +
                            getContainerStyle(originalImageDimensions, showOriginalLarge).className
                          }
                          style={getContainerStyle(originalImageDimensions, showOriginalLarge).style}
                        >
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="原始图片"
                            draggable={false}
                            className={
                              "cursor-pointer transition-all duration-500 ease-out will-change-transform " +
                              (showOriginalLarge
                                ? "w-full h-auto object-contain"
                                : "h-full w-full object-contain scale-[1.0] hover:scale-105")
                            }
                            onClick={toggleViewSize}
                            onLoad={handleOriginalImageLoad}
                          />

                          {/* 角标 - 已移除，避免遮挡画面 */}
                        </div>
                        <div className="mt-2 text-center text-sm font-medium text-[#374151] dark:text-gray-200">{dict.crop?.original_image || "原图"}</div>
                      </div>
                    </div>

                    {/* 右：裁剪结果（大小可切换） */}
                    <div
                      className={
                        "transition-all duration-300 ease-out " +
                        (showOriginalLarge ? "flex-shrink-0 w-[200px]" : "flex-1")
                      }
                    >
                      <div className="relative rounded-xl border border-[#E7EAF0] bg-[#FFF6EB] dark:bg-[#1C1712] shadow-sm p-4">
                        <div
                          className={
                            "group relative overflow-hidden rounded-lg bg-[#FFF6EB] dark:bg-[#1C1712] " +
                            getContainerStyle(croppedImageDimensions, !showOriginalLarge).className
                          }
                          style={getContainerStyle(croppedImageDimensions, !showOriginalLarge).style}
                        >
                          <img
                            src={`/api/download${cropResult.output.download_url.split('/api/download')[1]}`}
                            alt="裁剪后图片"
                            draggable={false}
                            className={
                              "transition-all duration-500 ease-out will-change-transform cursor-pointer " +
                              (!showOriginalLarge
                                ? "w-full h-auto object-contain"
                                : "h-full w-full object-contain scale-[1.0]")
                            }
                            onClick={toggleViewSize}
                            onLoad={handleCroppedImageLoad}
                          />

                          {/* 角标 - 已移除，避免遮挡画面 */}
                        </div>
                        <div className="mt-2 text-center text-sm font-medium text-[#374151] dark:text-gray-200">{dict.crop?.cropped_result || "裁剪结果"}</div>
                      </div>
                    </div>
                  </div>

                  {/* 独立的切换控制组件 */}
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex items-center gap-3">
                      <Dot
                        active={showOriginalLarge}
                        onClick={() => setShowOriginalLarge(true)}
                        label={dict.crop?.original_image || "原图"}
                      />
                      <Dot
                        active={!showOriginalLarge}
                        onClick={() => setShowOriginalLarge(false)}
                        label={dict.crop?.cropped_result || "裁剪结果"}
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-center items-center gap-4">
                      <Button
                        onClick={() => {
                          setSelectedFile(null);
                          setCropResult(null);
                          setError(null);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-sm border-[#E7EAF0] text-[#374151] hover:bg-[#FAFAFB]"
                      >
                        🔄 {dict.crop?.restart || "重新开始"}
                      </Button>
                      {cropResult.output?.download_url && (
                        <Button
                          onClick={() => window.open(`/api/download${cropResult.output.download_url.split('/api/download')[1]}`, '_blank')}
                          className="bg-[#FF6B4A] hover:bg-[#E85E43] text-white text-sm font-medium shadow-sm"
                          size="sm"
                        >
                          📥 {dict.crop?.download_result || "下载裁剪结果"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-[#FFF6EB] dark:bg-[#1C1712]">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>{dict.crop?.processing || "处理中..."}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Crop Parameters Section */}
            <div>
              <h4 className="text-lg font-medium text-[#FF6B4A] mb-3 dark:text-orange-300 flex items-center">
                <span className="mr-2">👁️</span>
                {dict.crop?.crop_parameters || "裁剪参数"}
              </h4>
              <div className="bg-[#FFF6EB] dark:bg-[#1C1712] rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  {cropResult.crop_params && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] dark:text-gray-400">{dict.crop?.original_size || "原始尺寸"}:</span>
                        <span className="font-mono text-[#374151] dark:text-gray-300">
                          {cropResult.metadata?.original?.width || "×"} × {cropResult.metadata?.original?.height || "×"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] dark:text-gray-400">{dict.crop?.crop_area || "裁剪区域"}:</span>
                        <span className="font-mono text-[#374151] dark:text-gray-300">
                          {cropResult.crop_params.width || "×"} × {cropResult.crop_params.height || "×"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] dark:text-gray-400">{dict.crop?.crop_position || "裁剪位置"}:</span>
                        <span className="font-mono text-[#374151] dark:text-gray-300">
                          ({cropResult.crop_params.x || 0}, {cropResult.crop_params.y || 0})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] dark:text-gray-400">{dict.crop?.output_size || "输出尺寸"}:</span>
                        <span className="font-mono text-[#374151] dark:text-gray-300">
                          {cropResult.metadata?.cropped?.width || "×"} × {cropResult.metadata?.cropped?.height || "×"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}