from models import db, gen_id

class CompanyBranch(db.Model):
    __tablename__ = 'company_branches'

    _id = db.Column(db.String(36), primary_key=True, default=gen_id)
    company_id = db.Column(db.String(36), db.ForeignKey('companies._id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            '_id': self._id,
            'company_id': self.company_id,
            'name': self.name,
            'address': self.address,
            'lat': self.lat,
            'lng': self.lng
        }
