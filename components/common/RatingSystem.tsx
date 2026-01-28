import React, { useState } from 'react';
import { submitFeedback } from '../../services/geminiService';

const FEEDBACK_TAGS = [
    "Sai bố cục gốc", 
    "Hoa nhìn giả", 
    "Vải nhựa/cứng", 
    "Ánh sáng quá tối", 
    "Sai màu sắc", 
    "Chi tiết bị méo",
    "Bố cục hoàn hảo", 
    "Ánh sáng đẹp", 
    "Vật liệu chân thực",
    "Đúng phong cách"
];

interface RatingSystemProps {
    renderId: string;
    onRated: () => void;
    onReward?: (amount: number) => void;
}

export const RatingSystem: React.FC<RatingSystemProps> = ({ renderId, onRated, onReward }) => {
    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        if (!renderId) return;
        setIsSubmitting(true);
        try {
            await submitFeedback(renderId, rating, selectedTags);
            
            // Logic thưởng credit
            if (onReward) {
                onReward(1);
            }
            
            setIsSuccess(true);
            setTimeout(() => {
                onRated();
            }, 2000); // Đợi 2s để user thấy thông báo success
        } catch (error) {
            console.error("Lỗi gửi đánh giá:", error);
            alert("Có lỗi xảy ra khi gửi đánh giá.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="mt-6 p-6 bg-green-50 rounded-2xl border border-green-100 text-center animate-in fade-in">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">🎁</span>
                </div>
                <h4 className="font-serif font-bold text-green-800 text-lg">Cảm ơn đánh giá của bạn!</h4>
                <p className="text-green-600">Hệ thống đã học hỏi kinh nghiệm này. Bạn nhận được +1 Credit.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 p-6 bg-white rounded-2xl border border-luxury-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            
            <h4 className="text-center font-serif font-bold text-luxury-900 mb-2">Giúp AI học tập từ kết quả này</h4>
            <p className="text-center text-xs text-luxury-500 mb-6 italic">Đánh giá của bạn sẽ giúp các bản render sau đẹp hơn.</p>

            {/* Sao */}
            <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                    <button
                        key={s}
                        onClick={() => setRating(s)}
                        className={`text-4xl transition-transform hover:scale-110 focus:outline-none ${
                            rating >= s ? 'text-yellow-400 drop-shadow-md' : 'text-zinc-200'
                        }`}
                    >
                        ★
                    </button>
                ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {FEEDBACK_TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                            selectedTags.includes(tag)
                                ? 'bg-luxury-800 text-white border-luxury-800 shadow-md'
                                : 'bg-luxury-50 text-luxury-600 border-luxury-200 hover:border-luxury-300'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className={`w-full py-3 rounded-xl font-bold tracking-widest transition-all ${
                    rating === 0 || isSubmitting
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg active:scale-95'
                }`}
            >
                {isSubmitting ? 'ĐANG GỬI...' : 'GỬI ĐÁNH GIÁ'}
            </button>
        </div>
    );
};