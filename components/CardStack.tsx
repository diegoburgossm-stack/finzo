import React, { useState } from 'react';
import { CardWithBalance } from '../types';
import { CardComponent } from './CardComponent';
import { ChevronLeft, ChevronRight } from './Icons';

interface CardStackProps {
    cards: CardWithBalance[];
    onCardClick: (cardId: string) => void;
    onEdit?: (card: CardWithBalance) => void;
    onDelete?: (cardId: string) => void;
    theme: 'dark' | 'light';
}

export const CardStack: React.FC<CardStackProps> = ({
    cards,
    onCardClick,
    onEdit,
    onDelete,
    theme
}) => {
    const [activeIndex, setActiveIndex] = useState(0);

    if (cards.length === 0) return null;

    const handlePrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev === cards.length - 1 ? 0 : prev + 1));
    };

    const activeCard = cards[activeIndex];

    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* Stack Background - Cards behind */}
            <div className="relative h-[200px] lg:h-[220px]">
                {/* Background stacked cards */}
                {cards.slice(0, 3).map((card, index) => {
                    if (index === activeIndex) return null;

                    const offset = index === (activeIndex + 1) % cards.length ? 8 : 16;
                    const scale = index === (activeIndex + 1) % cards.length ? 0.95 : 0.9;
                    const opacity = index === (activeIndex + 1) % cards.length ? 0.6 : 0.3;

                    return (
                        <div
                            key={card.id}
                            className="absolute inset-0 transition-all duration-300"
                            style={{
                                transform: `translateY(${offset}px) scale(${scale})`,
                                opacity: opacity,
                                zIndex: cards.length - Math.abs(activeIndex - index),
                            }}
                        >
                            <CardComponent
                                card={card}
                                onClick={() => { }}
                                compact={true}
                            />
                        </div>
                    );
                })}

                {/* Active Card */}
                <div
                    className="absolute inset-0 transition-all duration-300 cursor-pointer"
                    style={{ zIndex: cards.length + 1 }}
                    onClick={() => onCardClick(activeCard.id)}
                >
                    <CardComponent
                        card={activeCard}
                        onClick={() => onCardClick(activeCard.id)}
                        compact={true}
                    />
                </div>
            </div>

            {/* Navigation Controls */}
            {cards.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                        onClick={handlePrevious}
                        className={`p-2 rounded-full transition-all ${theme === 'dark'
                                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                : 'bg-white hover:bg-slate-100 text-slate-800 shadow-sm'
                            }`}
                        aria-label="Tarjeta anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* Dots Indicator */}
                    <div className="flex gap-2">
                        {cards.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveIndex(index);
                                }}
                                className={`h-2 rounded-full transition-all ${index === activeIndex
                                        ? 'w-8 bg-primary'
                                        : `w-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`
                                    }`}
                                aria-label={`Ir a tarjeta ${index + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className={`p-2 rounded-full transition-all ${theme === 'dark'
                                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                : 'bg-white hover:bg-slate-100 text-slate-800 shadow-sm'
                            }`}
                        aria-label="Tarjeta siguiente"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Card Counter */}
            <div className="text-center mt-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeCard.name} ({activeIndex + 1} de {cards.length})
                </p>
            </div>
        </div>
    );
};
