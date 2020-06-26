# Plot / Interval / Labels
# No description available.
# ---
from synth import FakeCategoricalSeries
from telesync import site, data, ui

page = site['/demo']

n = 20
f = FakeCategoricalSeries()
v = page.add('example', ui.plot_card(
    box='1 1 4 5',
    title='Label Customization',
    data=data('product price', n),
    vis=ui.vis([
        ui.mark(mark='interval', x='=product',
                y='=${{intl price minimum_fraction_digits=2 maximum_fraction_digits=2}}', y_min=0,
                color='#333333',
                label='=${{intl price minimum_fraction_digits=2 maximum_fraction_digits=2}}',
                label_offset=0, label_position='middle', label_rotation=-90, label_fill_color='#fff',
                label_font_weight='bold')])
))
v.data = [(c, x) for c, x, dx in [f.next() for _ in range(n)]]

page.sync()