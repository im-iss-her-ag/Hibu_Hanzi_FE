# Hibu Hanzi — Hệ thiết kế "Mực & Giấy"

> Thay thế hoàn toàn UI-SPEC cũ. Token nằm ở `src/styles/tokens.css`. File này là nguồn sự thật cho giao diện; DESIGN.md là tài liệu sản phẩm/kiến trúc.

## 1. Ý tưởng

Người Việt học chữ Hán bằng **vở tập viết ô mễ tự, mực đen, dấu son đỏ**. App là cuốn vở đó, được làm lại cho màn hình:

- **Giấy dó** làm nền (ấm, không trắng chói), **mực** cho chữ, **son đỏ** chỉ dùng cho dấu ấn: thương hiệu, âm Hán Việt của chữ đang học, hành động chính, thứ đang được chọn.
- **Ô mễ tự** là motif chủ đạo: khung chữ lớn, và lặp lại tinh tế ở ô thành phần, ô trong danh sách.
- **Chiết tự là ngôi sao**, không phải một panel phụ bên phải. Phép cộng 女 + 子 → 好 được trình bày to, đẹp, như một trang sách giáo khoa hay.
- **Pinyin tô màu theo thanh điệu** (xanh dương/lục/hổ phách/tím/xám). Đây là trợ giúp học thật, không phải trang trí.
- **Hán Việt là điểm khác biệt của sản phẩm**, nên ở màn học nó là dòng nổi nhất sau chữ Hán: đứng **trên** pinyin, serif (Noto Serif) đậm, in hoa, 48–64px, màu son. Pinyin là dòng phụ bên dưới. Ở danh sách, tìm kiếm, từ ghép thì Hán Việt dùng serif in hoa màu mực.

Cảm giác cần đạt: yên tĩnh, có chủ đích, như một cuốn từ điển in đẹp kết hợp sự nhanh nhạy của Linear. Không gradient, không glow, không hình viên thuốc, không card lồng card, không emoji.

## 2. Token (tóm tắt, chi tiết ở tokens.css)

| Nhóm | Token |
|---|---|
| Nền | `--paper` (nền app), `--paper-2` (vùng lõm: rail), `--sheet` (bề mặt nổi: trang học, modal) |
| Chữ | `--ink`, `--ink-2`, `--ink-3` (label/meta), `--ink-4` (placeholder) |
| Kẻ | `--rule` (hairline), `--rule-strong` (viền input, khung ô chữ), `--grid` (đường kẻ ô mễ tự màu son nhạt) |
| Nhấn | `--seal`, `--seal-soft`, `--seal-line`, `--seal-ink` |
| Thanh điệu | `--tone-1..5`; class `.py.t1..t5`; dùng `pinyinSyllables()` / `toneOf()` trong `src/utils/tone.ts` |
| Ngữ nghĩa | `--etymology` (nguồn gốc thật), `--mnemonic` (mẹo nhớ) |
| Font | `--font-ui` Be Vietnam Pro · `--font-display` Noto Serif · `--font-han` Noto Serif SC · `--font-han-brush` Ma Shan Zheng |
| Cỡ chữ | `--text-xs` 11 · `sm` 12.5 · `md` 14 · `lg` 16 · `xl` 20 · `2xl` 28 · `3xl` 40 |
| Khoảng cách | `--space-1..8` = 4 8 12 16 24 32 48 64 |
| Bo góc | cấu trúc (panel, trang, ô chữ) **0**; control `--radius-md` 3px; tag 2px; `--radius-round` chỉ cho chấm |
| Chiều cao | `--control-h` 36, `--control-h-sm` 30, `--touch` 44 |
| Bóng | `--shadow-float` CHỈ cho thứ nổi (popover, modal, drawer). Trang học dùng `--shadow-sheet` rất nhẹ hoặc chỉ viền |
| Chuyển động | `--ease`, `--dur-1` 120 (hover), `--dur-2` 200 (đổi chữ crossfade), `--dur-3` 320 (drawer) |
| Layout | `--header-h` 56, `--rail-w` 300, `--content-max` 980, `--nav-h` 64 |

Tiện ích có sẵn: `.label` (nhãn nhỏ in hoa), `.py.tN` (màu thanh), `kbd`/`.kbd` (gợi ý phím).

## 3. Bố cục và responsive

Ba mốc: **Desktop ≥ 1200**, **Tablet 768–1199**, **Mobile < 768**. Phải đẹp ở *mọi* độ rộng giữa các mốc (thử 1440, 1280, 1100, 900, 768, 600, 390, 360), không chỉ đúng tại mốc.

### Desktop ≥ 1200
```
┌ Header 56 ─────────────────────────────────────────────────────────────────┐
│ ■漢 Hibu Hanzi      [⌕ Tìm chữ, pinyin, Hán Việt, nghĩa…        Ctrl K]   ☆ 拼 ⋯ ◐ │
├ Rail 300 (paper-2) ┬ Main (scroll, paper) ──────────────────────────────────┤
│ HSK  1 2 3 4 5 6 ▾ │  ┌ Sheet (max 980, sheet bg, hairline) ─────────────┐  │
│ [lọc trong cấp…]  │  │ HSK 1 · 81/300 · 6 nét · Phồn 好      ☆  ← 狗 话 │  │
│ ┌──┬──┬──┬──┐     │  │ ┌──────────┐  hǎo  🔊 🐢                        │  │
│ │好│明│休│行│     │  │ │   好     │  HẢO          (serif, tracked)     │  │
│ ├──┼──┼──┼──┤     │  │ │  (ô mễ)  │  tốt, hay                          │  │
│ │..│..│..│..│     │  │ └──────────┘  Cách đọc khác: hào · HIẾU · thích │  │
│ (lưới ô vuông      │  │ [Chữ | Nét | Viết]                                │  │
│  liền, kẻ mảnh)    │  │ ── CHIẾT TỰ ─────────────────────────────────────  │  │
│                    │  │   ┌──┐     ┌──┐     ┌──┐                          │  │
│                    │  │   │女│  +  │子│  =  │好│                          │  │
│                    │  │   └──┘     └──┘     └──┘                          │  │
│                    │  │   NỮ nǚ    TỬ zǐ                                   │  │
│                    │  │   phụ nữ   con                                     │  │
│                    │  │ ┌ NGUỒN GỐC ─────────┐┌ MẸO NHỚ ────────────────┐ │  │
│                    │  │ │ …                   ││ …                      │ │  │
│                    │  │ ── TỪ GHÉP ───────────────────────────────────── │  │
│                    │  └──────────────────────────────────────────────────┘  │
│                    │  ┌ Nav (sticky đáy main, 64) ‹ Trước  [⤮ Ngẫu nhiên ␣]  Tiếp › ┐ │
└────────────────────┴───────────────────────────────────────────────────────┘
```
- **Không còn cột phải.** Chiết tự, nguồn gốc, mẹo nhớ, từ ghép nằm trong cùng một "trang" (sheet) dưới phần chữ, cuộn cùng nhau. Một luồng đọc duy nhất từ trên xuống.
- Rail bên trái nền `--paper-2`, ngăn bằng 1px `--rule`. Có thể thu gọn (nút ở header rail, phím `L`); trạng thái nhớ trong localStorage.
- Thanh điều hướng dính đáy cột Main, luôn nhìn thấy, căn giữa theo sheet.

### Tablet 768–1199
- Rail thành **drawer trượt từ trái** (overlay + scrim), mở bằng nút "Danh sách" ở đầu header (icon lưới + chữ) hoặc phím `L`. Đóng: Esc, bấm scrim, chọn một chữ.
- Main full width, sheet max 980 căn giữa, padding ngang 24.
- Hero: ô chữ bên trái + thông tin bên phải khi đủ chỗ (≥ 720px nội dung); hẹp hơn thì xếp dọc, căn giữa.

### Mobile < 768
- Header 52: logo nhỏ · (khoảng trống) · ⌕ · ☆ · ⋯. Theme nằm trong ⋯.
- Sheet bỏ viền, full-bleed, padding ngang 16.
- Hero xếp dọc **căn giữa**: meta · ô chữ (min(72vw, 300px)) · mode switch rộng bằng ô chữ · pinyin + loa · HÁN VIỆT · nghĩa. Mọi thứ cùng một trục giữa.
- Chiết tự: phép cộng vẫn nằm ngang nếu ≤ 3 thành phần (ô 64px), nhiều hơn thì xuống dòng gọn gàng.
- Nguồn gốc / Mẹo nhớ xếp dọc.
- **Bottom nav cố định** 64 + safe-area: 4 ô cùng kích thước, cùng kiểu: Danh sách · Trước · Ngẫu nhiên (primary) · Tiếp. Danh sách mở bottom sheet (90vh, có tay nắm, kéo xuống/Esc/scrim để đóng).
- Không bao giờ có thanh cuộn ngang. Vùng chạm ≥ 44px.

## 4. Thành phần

### Nút
- `primary`: nền `--seal`, chữ `--seal-ink`, cao 36 (mobile 44), radius 3, weight 600. **Tối đa một nút primary trên màn hình** (Ngẫu nhiên).
- `secondary`: nền `--sheet`, viền 1px `--rule-strong`, hover `--hover`.
- `ghost`: không nền/viền, hover `--hover`.
- `icon`: vuông 36 (mobile 44), ghost, có `aria-label` + `title` kèm phím tắt.
- Trạng thái: hover nền, active `--press`, focus-visible outline son 2px, disabled `--ink-4`.
- Nút cùng hàng phải **cùng chiều cao, cùng baseline**. Không trộn nút có viền và nút không viền trong cùng một nhóm điều khiển ngang hàng (trừ primary).

### Segmented control
- Khung viền 1px `--rule-strong`, radius 3, các ô dính nhau ngăn bởi 1px. Ô active: nền `--ink` chữ `--sheet` (đảo màu, giống con dấu mực). Cao 32.

### Input / ô tìm kiếm
- Cao 36, nền `--sheet`, viền 1px `--rule-strong`, radius 3, icon trái 16px, gợi ý `kbd` phải. Focus: viền `--seal`, không glow.

### Ô chữ (tianzige)
- Hình vuông, viền 1px `--rule-strong`, nền `--sheet`, đường kẻ chéo + chữ thập nét đứt `--grid`. Radius 0. Chữ bằng `--font-han` (hoặc brush khi người dùng chọn).
- Ô nhỏ (thành phần, danh sách) dùng cùng ngôn ngữ nhưng chỉ có chữ thập mờ.

### Tag
- Cao 18–20, radius 2, chữ 11px weight 600, nền `--seal-soft`/`--hover`, không viền nét đứt.

### Modal / drawer / popover
- Nền `--sheet`, radius 4, `--shadow-float`, scrim `--scrim`. Header 52: tiêu đề + nút đóng (icon). Esc, bấm scrim, trả focus về chỗ cũ. Mobile: modal thành full-screen sheet.

## 5. Chuyển động
- Đổi chữ: glyph và phần thông tin crossfade 200ms (opacity, có thể kèm translateY 4px). Không nhảy layout: các ô có chiều cao ổn định.
- Hover: 120ms, chỉ màu/nền.
- Drawer/bottom sheet: 320ms `--ease`.
- Tôn trọng `prefers-reduced-motion`.

## 6. Ngôn từ
- Tiếng Việt ngắn, viết hoa chữ đầu câu: "Danh sách", "Ngẫu nhiên", "Xem nét", "Tập viết", "Cách đọc khác", "Chiết tự", "Nguồn gốc", "Mẹo nhớ", "Từ ghép".
- Tooltip ghi phím: "Ngẫu nhiên (Space)".
- Trạng thái rỗng có câu hướng dẫn và một hành động, không chỉ "Không có dữ liệu".

## 7. Chất lượng: tiêu chí nghiệm thu mỗi component
1. Đúng token, không hard-code màu/cỡ/khoảng cách ngoài thang.
2. Đẹp ở 1440, 1280, 1100, 900, 768, 600, 390, 360 rộng; cao 900, 768, 650. Không tràn, không cắt chữ, không thanh cuộn ngang, không phần tử lệch trục.
3. Sáng và tối đều đạt (tương phản chữ ≥ 4.5:1).
4. Dữ liệu khó: chữ đa âm (好 行 了 长), nghĩa rất dài, Hán Việt dài, chữ có 4+ thành phần, chữ không có chiết tự / không có từ ghép, danh sách rỗng khi lọc.
5. Bàn phím: Tab đi đúng thứ tự, focus nhìn thấy, mọi phím tắt cũ vẫn chạy.
6. Không lỗi console, `npx tsc --noEmit` sạch.
