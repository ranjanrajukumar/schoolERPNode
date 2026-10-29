import { useState } from 'react';

const MAX_TAGS = 10;
const MAX_BANNER_BYTES = 200 * 1024;
const BANNER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Pick tags from the LMS tag master: type to narrow the list, click a tag (or press Enter for the first match) to add it. */
export function TagInput({ value, onChange, options }) {
  const [text, setText] = useState('');
  const has = (tag) => value.some((t) => t.toLowerCase() === tag.toLowerCase());
  const matches = options.filter(
    (t) => !has(t) && t.toLowerCase().includes(text.trim().replace(/^#/, '').toLowerCase()),
  );
  const add = (tag) => {
    if (tag && !has(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setText('');
  };
  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(matches[0]);
    } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="lms-tags">
      <div className="lms-tag-box">
        {value.map((tag) => (
          <span className="lms-tag" key={tag}>
            #{tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          maxLength={30}
          placeholder={options.length ? 'Search the tag master' : 'No tags in the master yet'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          aria-label="Search tags"
          disabled={!options.length}
        />
      </div>
      <small className="hint">
        {value.length}/{MAX_TAGS} tags. Tags help students and staff find a course.
        {!options.length && ' An admin adds tags under Learning Management, LMS Tags.'}
      </small>
      <div className="lms-tag-suggest" aria-label="Tags in the master">
        {matches.map((t) => (
          <button type="button" key={t} onClick={() => add(t)}>
            #{t}
          </button>
        ))}
        {options.length > 0 && !matches.length && (
          <small className="hint">
            {text
              ? 'No tag matches. An admin can add it under LMS Tags.'
              : 'Every tag in the master is already chosen.'}
          </small>
        )}
      </div>
    </div>
  );
}

/** Picks a PNG, JPG or WebP up to 200 KB and hands it back as a data URL. */
export function BannerPicker({ value, onChange, onError }) {
  const pick = (file) => {
    if (!file) return;
    if (!BANNER_TYPES.includes(file.type)) return onError('The banner must be a PNG, JPG or WebP image.');
    if (file.size > MAX_BANNER_BYTES) return onError('The banner image must be 200 KB or smaller.');
    const reader = new FileReader();
    reader.onload = () => {
      onError('');
      onChange(String(reader.result));
    };
    reader.onerror = () => onError('That image could not be read.');
    reader.readAsDataURL(file);
  };
  return (
    <div className="lms-banner-pick">
      {value ? (
        <img src={value} alt="Course banner preview" />
      ) : (
        <div className="lms-banner-empty">
          No banner yet. Recommended 800×400 px, PNG, JPG or WebP, up to 200 KB.
        </div>
      )}
      <div className="row-actions">
        <label className="ghost button">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {value ? 'Replace image' : 'Upload banner image'}
        </label>
        {value && (
          <button type="button" className="ghost" onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export const TagList = ({ tags }) =>
  tags?.length > 0 && (
    <span className="lms-tag-row">
      {tags.map((t) => (
        <span className="lms-tag small" key={t}>
          #{t}
        </span>
      ))}
    </span>
  );
