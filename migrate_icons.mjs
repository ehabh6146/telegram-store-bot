import { allQuery, runQuery } from './src/db.js';
import { findBrandIcon } from './src/iconLibrary.js';

async function fixIcons() {
  const cats = await allQuery('SELECT * FROM categories');
  for (const c of cats) {
    const brand = findBrandIcon(c.name);
    if (brand) {
      await runQuery('UPDATE categories SET icon = ?, image_url = ? WHERE id = ?', [brand.id, brand.imageUrl, c.id]);
      console.log('Updated Category ' + c.id + ' [' + c.name + '] -> icon: ' + brand.id + ', image: ' + brand.imageUrl);
    }
  }

  const prods = await allQuery('SELECT * FROM products');
  for (const p of prods) {
    const brand = findBrandIcon(p.name);
    if (brand) {
      await runQuery('UPDATE products SET icon = ?, image_url = ? WHERE id = ?', [brand.id, brand.imageUrl, p.id]);
      console.log('Updated Product ' + p.id + ' [' + p.name + '] -> icon: ' + brand.id + ', image: ' + brand.imageUrl);
    }
  }
}

fixIcons().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
