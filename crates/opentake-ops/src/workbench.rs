//! User-ordered rough cut.
//!
//! The order is exactly the order the caller supplies. This module does not
//! classify footage, detect scenes, or choose an effect. A later narrative or
//! effect pass can emit the same [`PlannedRoughCut`] and reuse the existing
//! placement command without replacing the timeline model.

use opentake_domain::{ClipType, TextStyle, Transform};

/// One imported asset the user chose, already converted to timeline frames.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UserRoughCutItem {
    pub media_ref: String,
    pub media_type: ClipType,
    pub duration_frames: i32,
    pub has_audio: bool,
}

/// One clip to place, in timeline order. `start_frame` already includes the
/// previous items; nothing here reorders the input.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PlannedRoughCutClip {
    pub media_ref: String,
    pub media_type: ClipType,
    pub start_frame: i32,
    pub duration_frames: i32,
    pub has_audio: bool,
    pub add_linked_audio: bool,
}

/// Optional title written by the user. Style is the plain default; the user
/// changes size, color, and position afterwards and can lock those fields.
#[derive(Clone, Debug, PartialEq)]
pub struct PlannedTitle {
    pub content: String,
    pub duration_frames: i32,
    pub text_style: TextStyle,
    pub transform: Transform,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PlannedRoughCut {
    pub clips: Vec<PlannedRoughCutClip>,
    pub title: Option<PlannedTitle>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RoughCutError {
    Empty,
    InvalidItem { index: usize, reason: String },
    TitleDuration,
}

/// Sequence `items` back-to-back in the given order.
///
/// Video with audio also requests a linked audio clip. Audio-only items occupy
/// the same timeline cursor, so they are not stacked on top of the previous
/// shot. Image and Lottie items do not grow a linked audio clip.
pub fn plan_user_rough_cut(
    items: &[UserRoughCutItem],
    title: Option<String>,
    title_duration_frames: i32,
) -> Result<PlannedRoughCut, RoughCutError> {
    if items.is_empty() {
        return Err(RoughCutError::Empty);
    }
    let mut cursor: i32 = 0;
    let mut clips = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        if item.media_ref.trim().is_empty() {
            return Err(RoughCutError::InvalidItem {
                index,
                reason: "media ref is empty".into(),
            });
        }
        if item.media_type == ClipType::Text {
            return Err(RoughCutError::InvalidItem {
                index,
                reason: "text is added as a title, not as source media".into(),
            });
        }
        if item.duration_frames < 1 {
            return Err(RoughCutError::InvalidItem {
                index,
                reason: "duration must be at least 1 frame".into(),
            });
        }
        let end =
            cursor
                .checked_add(item.duration_frames)
                .ok_or_else(|| RoughCutError::InvalidItem {
                    index,
                    reason: "timeline length overflows".into(),
                })?;
        let add_linked_audio = item.has_audio && item.media_type == ClipType::Video;
        clips.push(PlannedRoughCutClip {
            media_ref: item.media_ref.clone(),
            media_type: item.media_type,
            start_frame: cursor,
            duration_frames: item.duration_frames,
            has_audio: item.has_audio,
            add_linked_audio,
        });
        cursor = end;
    }

    let title = match title {
        Some(raw) => {
            let content = raw.trim().to_string();
            if content.is_empty() {
                None
            } else if title_duration_frames < 1 {
                return Err(RoughCutError::TitleDuration);
            } else {
                let text_style = TextStyle {
                    font_size: 72.0,
                    ..TextStyle::default()
                };
                Some(PlannedTitle {
                    content,
                    duration_frames: title_duration_frames,
                    text_style,
                    transform: Transform::default(),
                })
            }
        }
        None => None,
    };

    Ok(PlannedRoughCut { clips, title })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(
        media_ref: &str,
        media_type: ClipType,
        frames: i32,
        has_audio: bool,
    ) -> UserRoughCutItem {
        UserRoughCutItem {
            media_ref: media_ref.into(),
            media_type,
            duration_frames: frames,
            has_audio,
        }
    }

    #[test]
    fn keeps_the_user_order_and_does_not_overlap() {
        let plan = plan_user_rough_cut(
            &[
                item("b-roll", ClipType::Video, 30, true),
                item("voice", ClipType::Audio, 20, true),
                item("still", ClipType::Image, 15, false),
            ],
            None,
            0,
        )
        .unwrap();
        let starts: Vec<_> = plan.clips.iter().map(|clip| clip.start_frame).collect();
        assert_eq!(starts, vec![0, 30, 50]);
        assert!(plan.clips[0].add_linked_audio);
        assert!(!plan.clips[1].add_linked_audio);
        assert!(!plan.clips[2].add_linked_audio);
        assert_eq!(plan.clips[1].media_type, ClipType::Audio);
        assert!(plan.title.is_none());
    }

    #[test]
    fn blank_title_is_not_an_automatic_caption() {
        let plan = plan_user_rough_cut(
            &[item("shot", ClipType::Video, 10, false)],
            Some("  ".into()),
            30,
        )
        .unwrap();
        assert!(plan.title.is_none());
    }
}
