import React from 'react';

interface ClickablePlayerNameProps {
  tag: string;
  name: string;
  onClick: (tag: string) => void;
  className?: string;
  showTag?: boolean;
}

export const ClickablePlayerName: React.FC<ClickablePlayerNameProps> = ({
  tag,
  name,
  onClick,
  className = '',
  showTag = true,
}) => {
  return (
    <button
      onClick={() => onClick(tag)}
      className={`text-left hover:text-primary transition-colors cursor-pointer ${className}`}
    >
      <div>
        <p className="font-medium">{name}</p>
        {showTag && (
          <p className="text-xs text-muted-foreground">{tag}</p>
        )}
      </div>
    </button>
  );
};
