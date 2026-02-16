"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useFirebase } from "../lib/firebase-provider";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
} from "firebase/firestore";
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";

const aspectRatioOptions = [
    { value: "9:16", label: "9:16 (Vertical/Reels)" },
    { value: "4:5", label: "4:5 (Portrait)" },
    { value: "16:9", label: "16:9 (Landscape)" },
    { value: "1:1", label: "1:1 (Square)" },
];

const categoryOptions = [
    "Lifestyle", "Fashion", "Tech", "Food", "Travel",
    "Beauty", "Fitness", "Education", "Entertainment", "Other",
];

export default function ExploreVideosPage() {
    const { db, storage } = useFirebase();

    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [creatorName, setCreatorName] = useState("");
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [category, setCategory] = useState("");
    const [videoFile, setVideoFile] = useState(null);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    const videoInputRef = useRef(null);
    const thumbnailInputRef = useRef(null);

    // Real-time listener for explore videos
    useEffect(() => {
        const q = query(
            collection(db, "exploreVideos"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const videosList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setVideos(videosList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const handleVideoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 100 * 1024 * 1024) {
                alert("Video must be under 100MB.");
                return;
            }
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
        }
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Thumbnail must be under 5MB.");
                return;
            }
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setCreatorName("");
        setAspectRatio("9:16");
        setCategory("");
        setVideoFile(null);
        setThumbnailFile(null);
        setVideoPreview(null);
        setThumbnailPreview(null);
        setShowForm(false);
        setUploadProgress("");
        if (videoInputRef.current) videoInputRef.current.value = "";
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    };

    const handleUpload = async () => {
        if (!videoFile || !title.trim() || !creatorName.trim()) {
            alert("Please fill in all required fields and select a video.");
            return;
        }

        setIsUploading(true);
        setUploadProgress("Uploading video...");

        try {
            // 1. Upload video
            const videoFileName = `explore-videos/admin/${Date.now()}_${videoFile.name}`;
            const videoStorageRef = ref(storage, videoFileName);
            const videoSnapshot = await uploadBytes(videoStorageRef, videoFile);
            const videoUrl = await getDownloadURL(videoSnapshot.ref);

            // 2. Upload thumbnail if provided
            let thumbnailUrl = "";
            if (thumbnailFile) {
                setUploadProgress("Uploading thumbnail...");
                const thumbFileName = `explore-thumbnails/admin/${Date.now()}_${thumbnailFile.name}`;
                const thumbStorageRef = ref(storage, thumbFileName);
                const thumbSnapshot = await uploadBytes(thumbStorageRef, thumbnailFile);
                thumbnailUrl = await getDownloadURL(thumbSnapshot.ref);
            }

            // 3. Save to Firestore
            setUploadProgress("Saving...");
            await addDoc(collection(db, "exploreVideos"), {
                title: title.trim(),
                description: description.trim(),
                videoUrl,
                thumbnailUrl,
                creatorName: creatorName.trim(),
                aspectRatio,
                category: category || null,
                uploadedBy: "admin",
                isActive: true,
                createdAt: serverTimestamp(),
            });

            resetForm();
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed: " + error.message);
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    };

    const handleToggleActive = async (video) => {
        try {
            await updateDoc(doc(db, "exploreVideos", video.id), {
                isActive: !video.isActive,
            });
        } catch (error) {
            console.error("Toggle error:", error);
            alert("Failed to update video status.");
        }
    };

    const handleDelete = async (video) => {
        try {
            // Delete from storage
            if (video.videoUrl) {
                try {
                    const videoRef = ref(storage, video.videoUrl);
                    await deleteObject(videoRef);
                } catch (e) { /* may not exist */ }
            }
            if (video.thumbnailUrl) {
                try {
                    const thumbRef = ref(storage, video.thumbnailUrl);
                    await deleteObject(thumbRef);
                } catch (e) { /* may not exist */ }
            }

            // Delete doc
            await deleteDoc(doc(db, "exploreVideos", video.id));
            setDeleteConfirm(null);
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete video.");
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.seconds) return "—";
        return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Explore Videos</h1>
                            <p className="text-xs text-muted-foreground">Manage video content for business explore feed</p>
                        </div>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-hover transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Video
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Upload Form */}
                {showForm && (
                    <div className="mb-8 rounded-xl border border-primary/20 bg-card overflow-hidden shadow-lg shadow-primary/5">
                        <div className="px-6 py-4 border-b border-border bg-primary/5">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                                Upload New Video
                            </h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Videos will be visible on the business explore feed</p>
                        </div>

                        <div className="p-6">
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Left: File uploads */}
                                <div className="space-y-5">
                                    {/* Video upload area */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Video File <span className="text-destructive">*</span>
                                        </label>
                                        <div
                                            onClick={() => videoInputRef.current?.click()}
                                            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                        >
                                            {videoPreview ? (
                                                <div className="relative aspect-[9/16] max-h-72 mx-auto rounded-lg overflow-hidden bg-black">
                                                    <video
                                                        src={videoPreview}
                                                        className="w-full h-full object-contain"
                                                        muted
                                                        playsInline
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <svg className="w-12 h-12 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-4">
                                                    <svg className="w-12 h-12 mx-auto text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                    </svg>
                                                    <p className="text-sm text-muted-foreground mt-3 font-medium">Click to select a video file</p>
                                                    <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WEBM — up to 100MB</p>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={videoInputRef}
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={handleVideoChange}
                                        />
                                        {videoFile && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                ✓ {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)}MB)
                                            </p>
                                        )}
                                    </div>

                                    {/* Thumbnail upload area */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Thumbnail (Optional)</label>
                                        <div
                                            onClick={() => thumbnailInputRef.current?.click()}
                                            className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                                        >
                                            {thumbnailPreview ? (
                                                <div className="relative aspect-video max-h-36 mx-auto rounded-lg overflow-hidden">
                                                    <img
                                                        src={thumbnailPreview}
                                                        alt="Thumbnail preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground py-2">Click to add a custom thumbnail</p>
                                            )}
                                        </div>
                                        <input
                                            ref={thumbnailInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleThumbnailChange}
                                        />
                                    </div>
                                </div>

                                {/* Right: Metadata */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Title <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Summer Fashion Lookbook"
                                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Creator Name <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={creatorName}
                                            onChange={(e) => setCreatorName(e.target.value)}
                                            placeholder="e.g., Aisha Sharma"
                                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="A short description of the video content..."
                                            rows={3}
                                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-y"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                Aspect Ratio <span className="text-destructive">*</span>
                                            </label>
                                            <select
                                                value={aspectRatio}
                                                onChange={(e) => setAspectRatio(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                            >
                                                {aspectRatioOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Category</label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                                            >
                                                <option value="">Select category</option>
                                                {categoryOptions.map((cat) => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                                {uploadProgress && (
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {uploadProgress}
                                    </div>
                                )}
                                <div className="flex gap-3 ml-auto">
                                    <button
                                        onClick={resetForm}
                                        disabled={isUploading}
                                        className="px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading || !videoFile || !title.trim() || !creatorName.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUploading ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                                </svg>
                                                Upload Video
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl border border-card-border bg-card p-4">
                        <p className="text-2xl font-bold">{videos.length}</p>
                        <p className="text-xs text-muted-foreground">Total Videos</p>
                    </div>
                    <div className="rounded-xl border border-card-border bg-card p-4">
                        <p className="text-2xl font-bold text-success">{videos.filter((v) => v.isActive).length}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div className="rounded-xl border border-card-border bg-card p-4">
                        <p className="text-2xl font-bold text-muted-foreground">{videos.filter((v) => !v.isActive).length}</p>
                        <p className="text-xs text-muted-foreground">Hidden</p>
                    </div>
                </div>

                {/* Video List */}
                <div className="rounded-xl border border-card-border bg-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="font-semibold">All Videos</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <svg className="w-8 h-8 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    ) : videos.length > 0 ? (
                        <div className="divide-y divide-border">
                            {videos.map((video) => (
                                <div
                                    key={video.id}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
                                >
                                    {/* Thumbnail */}
                                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                        {video.thumbnailUrl ? (
                                            <img
                                                src={video.thumbnailUrl}
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                </svg>
                                            </div>
                                        )}
                                        {!video.isActive && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold truncate">{video.title}</h4>
                                        <p className="text-sm text-muted-foreground truncate">
                                            by {video.creatorName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                                                {video.aspectRatio}
                                            </span>
                                            {video.category && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border text-xs">
                                                    {video.category}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${video.isActive
                                                    ? "bg-success/10 text-success"
                                                    : "bg-muted text-muted-foreground"
                                                }`}>
                                                {video.isActive ? "● Active" : "○ Hidden"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(video.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Toggle active */}
                                        <button
                                            onClick={() => handleToggleActive(video)}
                                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                                            title={video.isActive ? "Hide video" : "Show video"}
                                        >
                                            {video.isActive ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Preview link */}
                                        <a
                                            href={video.videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                                            title="Open video"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                            </svg>
                                        </a>

                                        {/* Delete */}
                                        <button
                                            onClick={() => setDeleteConfirm(video)}
                                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                            title="Delete video"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium">No Videos Yet</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                Upload your first video to start populating the explore feed.
                            </p>
                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Add Your First Video
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-xl border border-card-border shadow-2xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold">Delete Video</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Are you sure you want to delete <strong>&quot;{deleteConfirm.title}&quot;</strong>? This will remove the video file and cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
