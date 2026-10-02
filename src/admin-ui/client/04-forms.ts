/** Admin app client, part 4: listboxes, target selection and payout dispatch. */
export const CLIENT_FORMS = `
  function menuRef(key) {
    var ref = MENUS[key];
    return { root: byId(ref.dropdown), button: byId(ref.button), menu: byId(ref.menu) };
  }

  function setMenuOpen(key, open) {
    var ref = menuRef(key);
    if (!ref.root || !ref.button) return;
    ref.root.classList.toggle('open', open);
    ref.button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function markMenuSelection(key, value) {
    var ref = menuRef(key);
    if (!ref.menu) return;
    Array.prototype.forEach.call(ref.menu.querySelectorAll('[role="option"]'), function (option) {
      var selected = option.getAttribute('data-value') === value;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function selectOption(key, option, onSelect) {
    onSelect(option.getAttribute('data-value'));
    setMenuOpen(key, false);
    var ref = menuRef(key);
    if (ref.button) ref.button.focus();
  }

  function bindMenu(key, onSelect) {
    var ref = menuRef(key);
    if (!ref.root) return;
    ref.button.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = !ref.root.classList.contains('open');
      Object.keys(MENUS).forEach(function (other) { setMenuOpen(other, false); });
      setMenuOpen(key, open);
    });
    ref.button.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { setMenuOpen(key, false); return; }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      setMenuOpen(key, true);
      var first = ref.menu.querySelector('[role="option"]:not([aria-disabled="true"])');
      if (first) first.focus();
    });
    ref.menu.addEventListener('click', function (event) {
      var option = event.target.closest('[role="option"]');
      if (!option || option.getAttribute('aria-disabled') === 'true') return;
      selectOption(key, option, onSelect);
    });
    ref.menu.addEventListener('keydown', function (event) {
      var option = event.target.closest('[role="option"]');
      if (event.key === 'Escape') { setMenuOpen(key, false); ref.button.focus(); return; }
      if (!option) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        var options = Array.prototype.slice.call(ref.menu.querySelectorAll('[role="option"]'));
        var step = event.key === 'ArrowDown' ? 1 : -1;
        var current = options.indexOf(option);
        for (var jump = 1; jump <= options.length; jump += 1) {
          var candidate = options[Math.abs(current + step * jump) % options.length];
          if (candidate && candidate.getAttribute('aria-disabled') !== 'true') { candidate.focus(); return; }
        }
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && option.getAttribute('aria-disabled') !== 'true') {
        event.preventDefault();
        selectOption(key, option, onSelect);
      }
    });
  }


`;
